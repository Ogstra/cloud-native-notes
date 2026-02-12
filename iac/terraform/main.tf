terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    # Placeholder: User needs to configure this manually or via a bootstrap script
    bucket = "cloud-native-notes-tfstate-20260211234617499300000001"
    key    = "cloud-native-notes/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = "Cloud-Native-Notes"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

module "ecr" {
  source      = "./modules/ecr"
  environment = var.environment
}

module "networking" {
  source      = "./modules/networking"
  environment = var.environment
  vpc_cidr    = var.vpc_cidr
}

module "rds" {
  source             = "./modules/rds"
  environment        = var.environment
  vpc_id             = module.networking.vpc_id
  private_subnet_ids = module.networking.private_subnets
  db_password        = var.db_password
}

module "ecs" {
  source              = "./modules/ecs"
  environment         = var.environment
  vpc_id              = module.networking.vpc_id
  public_subnet_ids   = module.networking.public_subnets
  private_subnet_ids  = module.networking.private_subnets
  ecr_repo_url        = module.ecr.backend_repo_url
  frontend_repo_url   = module.ecr.frontend_repo_url
  db_url_ssm_arn      = module.rds.db_url_ssm_arn
  aws_region          = var.aws_region
  backend_image_tag   = var.backend_image_tag
  frontend_image_tag  = var.frontend_image_tag
  migration_image_tag = var.migration_image_tag
}
