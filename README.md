# Cloud Native Notes - AWS CI/CD with GitHub Actions, Terraform, and ECS

Production-oriented cloud-native setup for a Notes API + Frontend deployed on AWS.

## Architecture
- `Backend`: NestJS + Prisma + PostgreSQL
- `Frontend`: Vite + Nginx
- `Infra`: Terraform (`VPC`, `RDS`, `ECS Fargate`, `ALB`, `ECR`, `IAM`)
- `CI/CD`: GitHub Actions with OIDC to AWS

## Cloud-Native Production Features
- Strict 12-factor configuration (`ConfigModule` + startup env validation)
- Required env vars fail fast at startup (`PORT`, `DATABASE_URL`, `JWT_SECRET`)
- Structured JSON logging with level, timestamp, and `request_id`
- `X-Request-ID` propagation for request traceability
- `/healthz` endpoint with real DB connectivity check
- Graceful shutdown handling (`SIGTERM`, `SIGINT`)
- Multi-stage Docker builds with non-root runtime user

## Required Environment Variables

| Variable | Required | Example | Description |
|---|---|---|---|
| `PORT` | Yes | `3000` | Backend listening port |
| `DATABASE_URL` | Yes | `postgresql://user:pass@host:5432/db?schema=public` | PostgreSQL connection string |
| `JWT_SECRET` | Yes | `long-random-secret` | JWT signing key |
| `NODE_ENV` | No | `production` | Runtime mode |
| `LOG_LEVEL` | No | `info` | Log verbosity (`error`,`warn`,`log`,`debug`,`verbose`) |
| `CORS_ORIGIN` | No | `http://localhost:8080` | Allowed frontend origin |
| `VITE_API_URL` | For local frontend build | `http://localhost:3000/api` | Frontend API base URL |
| `POSTGRES_USER` | Local compose | `postgres` | Local DB user |
| `POSTGRES_PASSWORD` | Local compose | `postgres` | Local DB password |
| `POSTGRES_DB` | Local compose | `postgres` | Local DB name |
| `POSTGRES_PORT` | Local compose | `5432` | Local DB host port |
| `FRONTEND_PORT` | Local compose | `8080` | Frontend host port |

Use `.env.example` as baseline for local development.

## Run Locally with Docker Compose
```bash
cp .env.example .env
docker compose up --build
```

App endpoints:
- Frontend: `http://localhost:8080`
- API base: `http://localhost:3000/api`
- Health: `http://localhost:3000/healthz`

## CI/CD Workflows

### `infra.yml`
- Runs Terraform `init/fmt/validate/plan/apply`
- Trigger: changes in `iac/**` or manual dispatch

### `deploy.yml`
- Builds and pushes backend/frontend/migration images
- Registers ECS task definition revisions
- Runs Prisma migration task
- Updates ECS services and waits for stability

### `run-migration.yml`
- Manual on-demand migration task execution

## GitHub Secrets / Variables for CI

Required:
- Secret: `AWS_ROLE_TO_ASSUME`
- Secret: `TF_VAR_DB_PASSWORD`

Required for Terraform ECS backend config:
- Variable: `TF_VAR_JWT_SECRET_SSM_ARN` (ARN of SSM SecureString for JWT secret)

Optional:
- Variable: `TF_VAR_CORS_ORIGIN`
- Variable: `APP_URL` (used by deployment environment URL)

## Flow Diagram
```mermaid
flowchart LR
    A[Developer Push] --> B[GitHub Actions]
    B --> C[Build Backend/Frontend/Migration Images]
    C --> D[Push to Amazon ECR]
    D --> E[Register ECS Task Definitions]
    E --> F[Run Migration Task]
    F --> G[Update ECS Services]
    G --> H[ALB Routes Traffic]
    H --> I[Backend /healthz + /api]
    H --> J[Frontend /]
    I --> K[(Amazon RDS PostgreSQL)]
```

## Operational Commands
```bash
# Backend logs
aws logs tail /ecs/dev-app --since 15m --region us-east-1

# ECS service status
aws ecs describe-services --cluster dev-cluster --services dev-service dev-frontend-service --region us-east-1

# Wait for stable deployment
aws ecs wait services-stable --cluster dev-cluster --services dev-service dev-frontend-service --region us-east-1
```

## Rollback
```bash
aws ecs list-task-definitions --family-prefix dev-app --sort DESC --region us-east-1
aws ecs list-task-definitions --family-prefix dev-frontend --sort DESC --region us-east-1

aws ecs update-service --cluster dev-cluster --service dev-service --task-definition dev-app:<PREVIOUS_REV> --region us-east-1
aws ecs update-service --cluster dev-cluster --service dev-frontend-service --task-definition dev-frontend:<PREVIOUS_REV> --region us-east-1

aws ecs wait services-stable --cluster dev-cluster --services dev-service dev-frontend-service --region us-east-1
```
