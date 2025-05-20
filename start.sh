#!/bin/bash
docker-compose build

# Start Redis nodes
echo "Starting Redis nodes..."
docker-compose up -d redis-node1 redis-node2 redis-node3 redis-node4 redis-node5 redis-node6

# Wait for Redis nodes to be ready
echo "Waiting for Redis nodes to initialize..."
for node in {1..6}; do
  until docker exec -it atividade2-redis-node${node}-1 redis-cli ping | grep "PONG"; do
    echo "Redis node ${node} not ready yet. Waiting..."
    sleep 5
  done
done

# Configure Redis cluster
echo "Configuring Redis cluster..."
docker exec -it atividade2-redis-node1-1 redis-cli --cluster create \
  atividade2-redis-node1-1:6379 \
  atividade2-redis-node2-1:6379 \
  atividade2-redis-node3-1:6379 \
  atividade2-redis-node4-1:6379 \
  atividade2-redis-node5-1:6379 \
  atividade2-redis-node6-1:6379 \
  --cluster-replicas 1 \
  --cluster-yes

echo "Verifying cluster state..."
until docker exec atividade2-redis-node1-1 redis-cli cluster info | grep "cluster_state:ok"; do
  echo "Redis cluster not ready yet. Waiting..."
  sleep 5
done

echo "Starting CockroachDB nodes..."
docker-compose up -d cockroachdb1 cockroachdb2 cockroachdb3

# Proceed with initialization
docker-compose run cockroach-init

# Start RabbitMQ cluster
echo "Starting RabbitMQ cluster..."
docker-compose up -d rabbitmq1 rabbitmq2 rabbitmq3

# Wait for RabbitMQ nodes
for node in rabbitmq1 rabbitmq2 rabbitmq3; do
  until docker-compose exec $node rabbitmq-diagnostics -q ping; do
    echo "Waiting for $node..."
    sleep 5
  done
done


echo "Configuring RabbitMQ cluster..."
# Join rabbitmq2 to rabbitmq1
docker-compose exec rabbitmq2 rabbitmqctl stop_app
docker-compose exec rabbitmq2 rabbitmqctl reset
docker-compose exec rabbitmq2 rabbitmqctl join_cluster rabbit@rabbitmq1
docker-compose exec rabbitmq2 rabbitmqctl start_app

# Join rabbitmq3 to rabbitmq1
docker-compose exec rabbitmq3 rabbitmqctl stop_app
docker-compose exec rabbitmq3 rabbitmqctl reset
docker-compose exec rabbitmq3 rabbitmqctl join_cluster rabbit@rabbitmq1
docker-compose exec rabbitmq3 rabbitmqctl start_app
docker-compose exec rabbitmq1 rabbitmqctl set_policy ha-all "^" \
  '{"ha-mode":"all", "ha-sync-mode":"automatic", "message-ttl":86400000}' --apply-to queues

echo "Waiting for RabbitMQ AMQP port (5672)..."
for node in rabbitmq1 rabbitmq2 rabbitmq3; do
  until docker-compose exec "$node" rabbitmq-diagnostics -q check_port_listener 5672; do
    echo "$node not ready. Retrying..."
    sleep 5
  done
done

# Start backend services
echo "Starting API services..."
docker-compose up -d php-api

echo "Starting frontend..."
docker-compose up -d frontend

# Wait for API replicas to be healthy
echo "Waiting replicas PHP-API..."
for i in {1..3}; do
  until docker inspect --format='{{.State.Health.Status}}' atividade2-php-api-${i} | grep "healthy"; do
    echo "Réplica php-api-${i} não está pronta..."
    sleep 5
  done
done

# Start haproxy
echo "Starting haproxy..."
docker-compose up -d haproxy

# Start workers
echo "Starting workers..."
docker-compose up -d worker

# Start nginx proxy
echo "Starting nginx proxy..."
docker-compose up -d nginx-proxy

# Start haproxy

# Final status
echo "All services started successfully!"
echo "CockroachDB: http://localhost:8080"
echo "RabbitMQ Management: http://localhost:15672 (admin/secret)"
echo "Haproxy: http://localhost:8404/stats"
echo "Nginx: http://localhost:8000" only for curls does not have UI
echo "Frontend: http://localhost:3000"