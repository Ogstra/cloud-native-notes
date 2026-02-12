variable "environment" {}
variable "vpc_id" {}
variable "public_subnet_ids" { type = list(string) }
variable "private_subnet_ids" { type = list(string) }
variable "ecr_repo_url" {}
variable "db_url_ssm_arn" {}
variable "aws_region" {}
