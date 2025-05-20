<?php
function connectCockroach() {
    static $conn = null;
    
    if ($conn !== null && $conn->query('SELECT 1')) {
        return $conn;
    }

    $dsn = "pgsql:host=" . getenv('DB_HOST') 
         . ";port=" . getenv('DB_PORT')
         . ";dbname=" . getenv('DB_DATABASE')
         . ";sslmode=disable";

    try {
        $conn = new PDO(
            $dsn,
            getenv('DB_USER'),
            getenv('DB_PASSWORD'),
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_PERSISTENT => false,
                PDO::ATTR_TIMEOUT => 3
            ]
        );
        return $conn;
    } catch (PDOException $e) {
        throw new Exception("Conexão com CockroachDB falhou: " . $e->getMessage());
    }
}