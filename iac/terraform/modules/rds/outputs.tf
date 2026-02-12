output "db_instance_endpoint" {
  value = aws_db_instance.main.endpoint
}

output "db_url_ssm_arn" {
  value = aws_ssm_parameter.db_url.arn
}
