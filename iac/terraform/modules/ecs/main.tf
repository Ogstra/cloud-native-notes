resource "aws_ecs_cluster" "main" {
  name = "${var.environment}-cluster"
}

resource "aws_ecs_task_definition" "app" {
  family                   = "${var.environment}-app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name  = "backend"
      image = "${var.ecr_repo_url}:${var.backend_image_tag}"

      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = var.db_url_ssm_arn
        }
      ]
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/${var.environment}-app"
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "backend"
          "awslogs-create-group"  = "true"
        }
      }
    }
  ])
}

resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${var.environment}-app"
  retention_in_days = 7
}

resource "aws_ecs_service" "main" {
  name            = "${var.environment}-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.public_subnet_ids
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.main.arn
    container_name   = "backend"
    container_port   = 3000
  }

  depends_on = [
    aws_lb_listener.http,
    aws_lb_listener_rule.api,
  ]
}

resource "aws_ecs_task_definition" "frontend" {
  family                   = "${var.environment}-frontend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name  = "frontend"
      image = "${var.frontend_repo_url}:${var.frontend_image_tag}"
      portMappings = [
        {
          containerPort = 8080
          hostPort      = 8080
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/${var.environment}-frontend"
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "frontend"
          "awslogs-create-group"  = "true"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "frontend" {
  name            = "${var.environment}-frontend-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.public_subnet_ids
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.frontend.arn
    container_name   = "frontend"
    container_port   = 8080
  }

  depends_on = [aws_lb_listener.http]
}

resource "aws_ecs_task_definition" "migration" {
  family                   = "${var.environment}-migration"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name    = "migration"
      image   = "${var.ecr_repo_url}:${var.migration_image_tag}"
      command = ["sh", "-c", "npx prisma migrate deploy && echo 'Migration Complete'"]
      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = var.db_url_ssm_arn
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/${var.environment}-migration"
          "awslogs-region"        = "us-east-1"
          "awslogs-stream-prefix" = "migration"
          "awslogs-create-group"  = "true"
        }
      }
    }
  ])
}
