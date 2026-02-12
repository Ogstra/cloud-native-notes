output "vpc_id" {
  value = module.networking.vpc_id
}

output "rds_endpoint" {
  value = module.rds.db_instance_endpoint
}

output "alb_dns_name" {
  value = module.ecs.alb_dns_name
}

output "ecs_security_group_id" {
  value = module.ecs.ecs_security_group_id
}

output "private_subnet_ids" {
  value = module.networking.private_subnets
}

output "public_subnet_ids" {
  value = module.networking.public_subnets
}
