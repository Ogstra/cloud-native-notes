variable "vpc_id" {}
variable "private_subnet_ids" { type = list(string) }
variable "environment" {}
variable "db_password" { sensitive = true }

resource "aws_db_subnet_group" "main" {
  name       = "${var.environment}-db-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name = "${var.environment}-db-subnet-group"
  }
}

resource "aws_security_group" "rds" {
  name_prefix = "${var.environment}-rds-sg-"
  vpc_id      = var.vpc_id

  # Ingress rule will be added by ECS module or separate rule to avoid circular dependency
  # But typically we allow VPC CIDR or specific SG
  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"] # Should be tighter in prod, e.g. ECS SG
  }

  tags = {
    Name = "${var.environment}-rds-sg"
  }
}

resource "aws_db_instance" "main" {
  identifier           = "${var.environment}-db"
  allocated_storage    = 20
  storage_type         = "gp2"
  engine               = "postgres"
  engine_version       = "16.3"
  instance_class       = "db.t3.micro" # Free Tier
  username             = "postgres"
  password             = var.db_password
  db_subnet_group_name = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  skip_final_snapshot  = true
  publicly_accessible  = false

  tags = {
    Name = "${var.environment}-db"
  }
}

resource "aws_ssm_parameter" "db_url" {
  name  = "/cloud-native-notes/${var.environment}/DATABASE_URL"
  type  = "SecureString"
  value = "postgresql://postgres:${var.db_password}@${aws_db_instance.main.endpoint}/postgres?schema=public"

  tags = {
    Environment = var.environment
  }
}
