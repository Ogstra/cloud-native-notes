variable "environment" {}
variable "vpc_id" {}
variable "public_subnet_ids" { type = list(string) }
variable "private_subnet_ids" { type = list(string) }
variable "ecr_repo_url" {}
variable "db_url_ssm_arn" {}
variable "frontend_repo_url" {}
variable "aws_region" {}
variable "backend_image_tag" {
  default = "latest"
}
variable "frontend_image_tag" {
  default = "latest"
}
variable "migration_image_tag" {
  default = "migration"
}
variable "jwt_secret_ssm_arn" {}
variable "cors_origin" {
  default = "*"
}
