variable "aws_region" {
  description = "AWS Region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment (dev, prod)"
  type        = string
  default     = "dev"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "db_password" {
  description = "Database master password (sensitive)"
  type        = string
  sensitive   = true
  # In production, this should be passed via environment variable or secrets manager
}

variable "backend_image_tag" {
  description = "Backend image tag deployed in ECS"
  type        = string
  default     = "latest"
}

variable "frontend_image_tag" {
  description = "Frontend image tag deployed in ECS"
  type        = string
  default     = "latest"
}

variable "migration_image_tag" {
  description = "Migration image tag deployed in ECS"
  type        = string
  default     = "migration"
}

variable "jwt_secret_ssm_arn" {
  description = "SSM SecureString ARN for backend JWT secret"
  type        = string
}

variable "cors_origin" {
  description = "Allowed CORS origin for backend API"
  type        = string
  default     = "*"
}
