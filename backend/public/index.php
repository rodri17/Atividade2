<?php
header("Content-Type: application/json");

class RabbitMQManager {
    private static $connection = null;
    private static $channel = null;

    public static function getChannel() {
        if (self::$connection === null || !self::$connection->isConnected()) {
            $nodes = explode(',', getenv('RABBITMQ_NODES'));
            $selectedNode = $nodes[0];
            list($host, $port) = explode(':', $selectedNode);

            self::$connection = new \PhpAmqpLib\Connection\AMQPStreamConnection(
                $host,
                $port,
                getenv('RABBITMQ_USER'),
                getenv('RABBITMQ_PASS'),
                '/',
                false,
                'AMQPLAIN',
                null,
                'en_US',
                30,
                30
            );

            self::$channel = self::$connection->channel();
            self::$channel->queue_declare(
                'dictionary_events',
                false,
                true,
                false,
                false,
                false,
                new \PhpAmqpLib\Wire\AMQPTable([
                    'x-queue-type' => 'quorum',
                    'x-delivery-limit' => 3
                ])
            );
        }
        return self::$channel;
    }

    public static function shutdown() {
        if (self::$channel) self::$channel->close();
        if (self::$connection) self::$connection->close();
    }
}

register_shutdown_function(['RabbitMQManager', 'shutdown']);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../postgres/db.php';
use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;
use PhpAmqpLib\Wire\AMQPTable;

try {
    $redis = new RedisCluster(null, explode(',', getenv('REDIS_NODES')), 1.5, 1.5, false);
} catch (Exception $e) {
    http_response_code(500);
    exit(json_encode(['erro' => 'Falha na conexão com o Redis: ' . $e->getMessage()]));
}

try {
    $db = connectCockroach();
} catch (Exception $e) {
    http_response_code(503);
    echo json_encode([
        'erro' => 'Falha na conexão com a base de dados',
        'detalhes' => $e->getMessage()
    ]);
    exit;
}

$request_path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path_parts = explode('/', trim($request_path, '/'));

if ($request_path === '/openapi.yaml') {
    header('Content-Type: text/yaml');
    readfile(__DIR__ . '/../openapi.yaml');
    exit;
}

if ($request_path === '/health') {
    try {
        echo json_encode([
            'status' => 'Ok'
        ]);
    } catch (Exception $e) {
        http_response_code(503);
        echo json_encode(['status' => 'degradado']);
    }
    exit;
}

switch ($_SERVER['REQUEST_METHOD']) {
    case 'PUT':
        $input = json_decode(file_get_contents('php://input'), true);

        if (!$input || !isset($input['data']['key'], $input['data']['value'])) {
            http_response_code(400);
            echo json_encode(['erro' => 'Formato de requisição inválido']);
            exit;
        }

        try {
            $msgBody = json_encode([
                'event' => 'word_updated',
                'key' => $input['data']['key'],
                'value' => $input['data']['value'],
                'timestamp' => (int)(microtime(true) * 1000),
                'node' => getenv('NODE_ID')
            ]);

            $channel = RabbitMQManager::getChannel();
            $msg = new AMQPMessage(
                $msgBody,
                ['delivery_mode' => AMQPMessage::DELIVERY_MODE_PERSISTENT]
            );
            $channel->basic_publish($msg, '', 'dictionary_events');

            echo json_encode(['status' => 'sucesso']);
        } catch (Exception $e) {
            error_log("Erro RabbitMQ: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['erro' => 'Falha ao publicar a mensagem']);
        }
        break;

    case 'GET':
        $key = $_GET['key'] ?? '';
        $value = $redis->get($key);

        if ($value) {
            $data = json_decode($value, true);
            echo json_encode(['data' => ['value' => $data['definition']]]);
        } else {
            $stmt = $db->prepare("SELECT definition FROM dictionary WHERE word = ?");
            $stmt->execute([$key]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($row) {
                $redis->set($key, json_encode([
                    'definition' => $row['definition'],
                    'timestamp' => (int)(microtime(true) * 1000),
                    'node' => getenv('NODE_ID')
                ]));
                echo json_encode(['data' => ['value' => $row['definition']]]);
            } else {
                http_response_code(404);
                echo json_encode(['erro' => 'Palavra não encontrada']);
            }
        }
        break;

    case 'DELETE':
        $key = $_GET['key'] ?? '';
        if (empty($key)) {
            http_response_code(400);
            echo json_encode(['erro' => 'Parâmetro key ausente']);
            exit;
        }

        try {

            $existsInCache = $redis->exists($key);
            $existsInDB = false;
            
            if (!$existsInCache) {
                $stmt = $db->prepare("SELECT word FROM dictionary WHERE word = ?");
                $stmt->execute([$key]);
                $existsInDB = (bool)$stmt->fetch(PDO::FETCH_ASSOC);
            }

            if (!$existsInCache && !$existsInDB) {
                http_response_code(404);
                echo json_encode(['erro' => 'Palavra não encontrada']);
                exit;
            }

            $msgBody = json_encode([
                'event' => 'word_deleted',
                'key' => $key,
                'timestamp' => (int)(microtime(true) * 1000),
                'node' => getenv('NODE_ID')
            ]);

            $channel = RabbitMQManager::getChannel();
            $msg = new AMQPMessage(
                $msgBody,
                ['delivery_mode' => AMQPMessage::DELIVERY_MODE_PERSISTENT]
            );
            $channel->basic_publish($msg, '', 'dictionary_events');

            echo json_encode(['status' => 'sucesso']);
        } catch (Exception $e) {
            error_log("Erro RabbitMQ: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['erro' => 'Falha ao publicar a mensagem']);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['erro' => 'Método não permitido']);
}
