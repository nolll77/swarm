variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-west-3"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "db_password" {
  description = "RDS master password"
  type        = string
  sensitive   = true
}

variable "openai_key" {
  description = "OpenAI API key"
  type        = string
  sensitive   = true
}

variable "github_token" {
  description = "GitHub token for PR creation"
  type        = string
  sensitive   = true
}

variable "ecr_repository_prefix" {
  description = "ECR repository prefix"
  type        = string
  default     = "ai-dev"
}
