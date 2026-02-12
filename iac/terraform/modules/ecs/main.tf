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
      image = "${var.ecr_repo_url}:latest"

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
    }
  ])
}

resource "aws_ecs_service" "main" {
  name            = "${var.environment}-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.main.arn
    container_name   = "backend"
    container_port   = 3000
  }
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
      name  = "migration"
      image = "${var.ecr_repo_url}:migration"
      command = ["sh", "-c", "npx prisma db push && echo 'Migration Complete'"]
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
