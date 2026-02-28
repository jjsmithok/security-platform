# Security Agent Layer - Main Module
# Phases 1-3: EventBridge, Policies, Lambda Remediation, Falco

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

# =====================================================
# VARIABLES
# =====================================================

variable "environment" {
  description = "Environment name (sandbox, dev, test, preprod, prod)"
  type        = string
  default     = "poc"
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "source_account_id" {
  description = "Source AWS account ID"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID for security groups"
  type        = string
  default     = ""
}

variable "s3_bucket_name" {
  description = "S3 bucket for Config recordings"
  type        = string
  default     = ""
}

variable "enable_falco" {
  description = "Enable Falco runtime detection"
  type        = bool
  default     = false
}

variable "instance_ids" {
  description = "EC2 instances for Falco"
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Common tags"
  type        = map(string)
  default     = {}
}

# =====================================================
# PHASE 1: EVENTBRIDGE (Event Routing)
# =====================================================

module "eventbridge" {
  source = "./modules/eventbridge"

  environment       = var.environment
  source_account_id = var.source_account_id
}

# =====================================================
# PHASE 2: POLICIES (AWS Config)
# =====================================================

module "policies" {
  source = "./modules/policies"

  environment    = var.environment
  s3_bucket_name = var.s3_bucket_name
}

# =====================================================
# PHASE 3: LAMBDA REMEDIATION (Playbooks)
# =====================================================

module "lambda_remediation" {
  source = "./modules/lambda-remediation"

  environment       = var.environment
  source_account_id = var.source_account_id
  region            = var.region
  sqs_queue_arn     = module.eventbridge.sqs_queue_arn
}

# =====================================================
# PHASE 2: FALCO (Runtime Detection)
# =====================================================

module "falco" {
  source = "./modules/falco"

  count = var.enable_falco ? 1 : 0

  environment = var.environment
  region      = var.region
  vpc_id      = var.vpc_id
  instance_ids = var.instance_ids
  eventbridge_bus = module.eventbridge.event_bus_name
}

# =====================================================
# OUTPUTS
# =====================================================

output "event_bus_name" {
  description = "EventBridge bus name"
  value       = module.eventbridge.event_bus_name
}

output "sqs_queue_url" {
  description = "SQS queue URL for security events"
  value       = module.eventbridge.sqs_queue_url
}

output "config_recorder_name" {
  description = "AWS Config recorder name"
  value       = module.policies.config_recorder_name
}

output "sns_alerts_topic" {
  description = "SNS topic for security alerts"
  value       = module.policies.sns_topic_arn
}

output "lambda_function_name" {
  description = "Lambda remediation function name"
  value       = module.lambda_remediation.lambda_function_name
}

output "falco_enabled" {
  description = "Whether Falco is enabled"
  value       = var.enable_falco
}

output "cost_estimate" {
  description = "Monthly cost estimate"
  value = {
    eventbridge    = "~$5/month (SQS)"
    policies       = "~$0/month (AWS Config free tier)"
    lambda         = "~$5/month (based on 1000 events/day)"
    falco          = var.enable_falco ? "~$0/month (self-hosted)" : "$0"
    total          = var.enable_falco ? "~$10/month" : "~$10/month"
  }
}
