# Cloud Native Notes - AWS CI/CD with GitHub Actions, Terraform, and ECS

This repository showcases an AWS deployment pipeline using GitHub Actions and Terraform.
This project uses a single deployment flow to keep the focus on CI/CD mechanics.
The same pipeline pattern can be extended to multi-environment promotion (`dev/stage/prod`).

## Goal
Automate:
1. Infrastructure provisioning (`Terraform`).
2. Application build and deployment (`ECS Fargate` + `ECR`).
3. Database migrations (`Prisma`).

## Stack
- `GitHub Actions`
- `Terraform`
- `AWS ECS Fargate`
- `AWS ECR`
- `AWS ALB`
- `AWS RDS PostgreSQL`

## Required GitHub Secrets
- `AWS_ROLE_TO_ASSUME`
- `TF_VAR_DB_PASSWORD`

## Workflows

### 1) Infrastructure
File: `.github/workflows/infra.yml`

Trigger:
- `push` to `main` with changes in `iac/**`
- `pull_request` with changes in `iac/**`
- `workflow_dispatch`

Actions:
- `terraform init`
- `terraform fmt -check`
- `terraform validate`
- `terraform plan`
- `terraform apply` only on `push` or manual run

### 2) Application Deploy
File: `.github/workflows/deploy.yml`

Trigger:
- `push` to `main` with changes in `app/**`
- `workflow_dispatch`

Actions:
- Build and push `backend`, `frontend`, and `migration` images with `github.sha` tags
- Register new ECS task definition revisions
- Run DB migration and validate `exitCode == 0`
- Update ECS services and wait for stable status

### 3) Manual Migration
File: `.github/workflows/run-migration.yml`

Trigger:
- `workflow_dispatch`

Actions:
- Run migration task in ECS
- Wait for completion
- Fail if `exitCode != 0`

## Standard Flow
1. Change infrastructure in `iac/**` and run `infra.yml`.
2. Change app code in `app/**` and run `deploy.yml`.
3. Run `run-migration.yml` manually only when needed.

## Rollback (Step 3)
Rollback means returning services to a previously stable task definition revision.

1. List previous revisions:
```bash
aws ecs list-task-definitions --family-prefix dev-app --sort DESC --region us-east-1
aws ecs list-task-definitions --family-prefix dev-frontend --sort DESC --region us-east-1
```

2. Pick known-good revisions (example: `dev-app:41`, `dev-frontend:20`) and update:
```bash
aws ecs update-service --cluster dev-cluster --service dev-service --task-definition dev-app:41 --region us-east-1
aws ecs update-service --cluster dev-cluster --service dev-frontend-service --task-definition dev-frontend:20 --region us-east-1
```

3. Wait until stable:
```bash
aws ecs wait services-stable --cluster dev-cluster --services dev-service dev-frontend-service --region us-east-1
```

4. Validate:
- `GET /api`
- normal login or guest login

## Useful Commands

Backend logs:
```bash
aws logs tail /ecs/dev-app --since 15m --region us-east-1
```

Service status:
```bash
aws ecs describe-services --cluster dev-cluster --services dev-service dev-frontend-service --region us-east-1
```
