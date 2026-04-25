# AWS Provider Configuration
provider "aws" {
  region = "eu-west-3"
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "ai-dev-platform-prod"
}

# RDS Instance (PostgreSQL)
resource "aws_db_instance" "postgres" {
  allocated_storage    = 20
  engine               = "postgres"
  engine_version       = "15.3"
  instance_class       = "db.t3.micro"
  db_name              = "ai_dev_saas"
  username             = "admin"
  password             = var.db_password
  skip_final_snapshot  = true
}

# ElastiCache Redis
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "ai-dev-redis"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
}

# S3 Bucket for Logs & Artifacts
resource "aws_s3_bucket" "artifacts" {
  bucket = "ai-dev-artifacts-prod"
}

# ECS Task Definition: API
resource "aws_ecs_task_definition" "api" {
  family                   = "api"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  
  container_definitions = jsonencode([{
    name  = "api"
    image = var.api_image_url
    portMappings = [{ containerPort = 3000 }]
    environment = [
      { name = "REDIS_URL", value = "redis://${aws_elasticache_cluster.redis.cache_nodes[0].address}:6379" },
      { name = "DATABASE_URL", value = "postgresql://admin:${var.db_password}@${aws_db_instance.postgres.endpoint}/ai_dev_saas" }
    ]
  }])
}

# ECS Task Definition: Worker
resource "aws_ecs_task_definition" "worker" {
  family                   = "worker"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  
  container_definitions = jsonencode([{
    name  = "worker"
    image = var.worker_image_url
    environment = [
      { name = "OPENAI_API_KEY", value = var.openai_key },
      { name = "REDIS_URL", value = "redis://${aws_elasticache_cluster.redis.cache_nodes[0].address}:6379" }
    ]
  }])
}
