# Security Agent Layer - Terraform

This module deploys Phases 1-3 of the Security Agent Layer for continuous policy enforcement and autonomous threat remediation.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Agent Layer                     │
├─────────────────────────────────────────────────────────────┤
│  Phase 1: Detection        Phase 2: Policies   Phase 3:    │
│  ┌─────────────────┐     ┌─────────────────┐  Remediation  │
│  │  EventBridge   │────▶│  AWS Config    │──┌──────────┐ │
│  │  Event Rules   │     │  Rules         │  │ Lambda   │ │
│  │  - IAM Changes │     │  - S3 Public   │  │ Playbook │ │
│  │  - SG Changes  │     │  - IAM Policy  │  │ Engine   │ │
│  │  - S3 Changes  │     │  - CloudTrail   │  └────┬─────┘ │
│  │  - GuardDuty   │     │                 │       │       │
│  └────────┬────────┘     └─────────────────┘       │       │
│           │                                          │       │
│           ▼                                          ▼       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              SQS Queue (Dead Letter Queue)          │   │
│  └──────────────────────────────────────────────────────┘   │
│           │                                                │
│           ▼                                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Lambda Event Processor                   │   │
│  │              (4 Autonomous Playbooks)                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Components

### Phase 1: EventBridge (Event Routing)
- **Event Bus**: Custom security event bus
- **SQS Queue**: Durable queue for event processing
- **Event Rules**: 
  - IAM policy changes
  - Security group modifications
  - S3 bucket policy changes
  - GuardDuty findings

### Phase 2: Policies (AWS Config)
- AWS Config recorder
- Config rules:
  - S3 bucket public access
  - IAM password policy
  - CloudTrail enabled
  - VPC Flow Logs
  - Unused IAM keys

### Phase 3: Lambda Remediation
- Python-based event processor
- 4 Autonomous Playbooks:
  1. **S3 Public Access**: Detect and alert on public buckets
  2. **IAM Policy Drift**: Monitor unauthorized IAM changes
  3. **Security Group Analysis**: Flag overly permissive rules
  4. **GuardDuty Response**: Handle security findings

## Usage

```bash
# Initialize Terraform
cd security-agent/terraform
terraform init

# Plan for POC
terraform plan -var-file=poc.tfvars -out=tfplan

# Apply
terraform apply tfplan
```

## GitHub Actions

The module includes two workflows:

1. **plan.yml**: Runs on PR, validates and plans
2. **apply.yml**: Runs on merge, applies changes

## Cost

| Component | Monthly Cost |
|-----------|-------------|
| EventBridge/SQS | ~$5 |
| AWS Config | Free tier |
| Lambda | ~$5 |
| **Total** | **~$10/mo** |

## Phases

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | EventBridge routing | ✅ Complete |
| Phase 2 | AWS Config policies | ✅ Complete |
| Phase 3 | Lambda remediation | ✅ Complete |
| Phase 4 | LLM reasoning | 🔮 Future |
| Phase 5 | EKS integration | 🔮 Future |
