<?php
require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../postgres/db.php';

use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;
use PhpAmqpLib\Wire\AMQPTable;

class HAProxyConnection {
    private $host;
    private $port;
    private $user;
    private $pass;
    
    public function __construct($node, $user, $pass) {
        list($this->host, $this->port) = explode(':', $node);
        $this->user = $user;
        $this->pass = $pass;
    }
    
    public function connect() {
        return new AMQPStreamConnection(
            $this->host,
            $this->port,
            $this->user,
            $this->pass,
            '/',
            false,
            'AMQPLAIN',
            null,
            'en_US',
            30,
            30,
            null,
            true,
            30
        );
    }
}

try {
    $db = connectCockroach();
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("Database connection failed: " . $e->getMessage());
}

$callback = function ($msg) use ($db) {
    try {
        $data = json_decode($msg->body, true);
        $key = $data['key'];
        
        try {
            $redis = new RedisCluster(null, explode(',', getenv('REDIS_NODES')), 1.5, 1.5, false);
            
            if ($data['event'] === 'word_updated') {
                $redis->set($key, json_encode([
                    'definition' => $data['value'],
                    'timestamp' => $data['timestamp'],
                    'node' => $data['node']
                ]));

                $stmt = $db->prepare("
                    INSERT INTO dictionary (word, definition, node, version, timestamp)
                    VALUES (?, ?, ?, ?, ?)
                    ON CONFLICT (word) DO UPDATE SET
                        definition = EXCLUDED.definition,
                        node = EXCLUDED.node,
                        version = EXCLUDED.version,
                        timestamp = EXCLUDED.timestamp
                ");
                $stmt->execute([
                    $key,
                    $data['value'],
                    $data['node'],
                    bin2hex(random_bytes(4)),
                    $data['timestamp']
                ]);
                
            } elseif ($data['event'] === 'word_deleted') {
                $redis->del($key);
                $db->prepare("DELETE FROM dictionary WHERE word = ?")->execute([$key]);
            }
            
            $msg->ack();
            echo " [✔] Processed: $key\n";
            
        } catch (Exception $e) {
            error_log("Processing Error: " . $e->getMessage());
            $msg->nack(false);
        }
    } catch (Exception $e) {
        error_log("Critical Error: " . $e->getMessage());
    }
};


$maxRetries = 5;
$retryDelay = 10;
$connection = null;

declare(ticks=1);
pcntl_signal(SIGTERM, function() use (&$channel, &$connection) {
    if ($channel) $channel->close();
    if ($connection) $connection->close();
    exit(0);
});

try {
    for ($retry = 0; $retry < $maxRetries; $retry++) {
        try {
            $connector = new HAProxyConnection(
                getenv('RABBITMQ_NODES'),
                getenv('RABBITMQ_USER'),
                getenv('RABBITMQ_PASS')
            );
            
            $connection = $connector->connect();
            $channel = $connection->channel();
            
            $channel->queue_declare(
                'dictionary_events', 
                false, 
                true, 
                false, 
                false, 
                false, 
                new AMQPTable([
                    'x-queue-type' => 'quorum',
                    'x-delivery-limit' => 3
                ])
            );
            
            $channel->basic_qos(null, 50, null);
            $channel->basic_consume(
                'dictionary_events', 
                'worker_' . gethostname(), 
                false, 
                false, 
                false, 
                false, 
                $callback
            );

            echo " [*] Connected. Waiting for messages (Attempt: " . ($retry + 1) . ")\n";
            
            while (count($channel->callbacks)) {
                $channel->wait();
            }
            
            break;
        } catch (Exception $e) {
            error_log("Connection Error: " . $e->getMessage());
            
            if ($connection) {
                try { $connection->close(); } catch (Exception $e) {}
                $connection = null;
            }
            
            if ($retry < $maxRetries - 1) {
                sleep($retryDelay);
                continue;
            }
            
            throw new Exception("Failed after $maxRetries attempts");
        }
    }
} catch (Exception $e) {
    error_log("Fatal Error: " . $e->getMessage());
    exit(1);
}

$channel->close();
$connection->close();