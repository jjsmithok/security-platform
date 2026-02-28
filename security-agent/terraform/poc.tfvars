# POC Environment Variables
# Security Agent Layer - Phase 1-3

environment       = "poc"
region            = "us-east-1"

# Account ID for Control Tower
source_account_id = "436667402925"

# VPC (leave empty for default)
vpc_id = ""

# S3 Bucket for Config (will be created if not provided)
s3_bucket_name = "security-agent-config-436667402925"

# Enable Falco (Phase 2)
enable_falco = false

# Instance IDs for Falco (optional)
instance_ids = []

# Tags
tags = {
  Project     = "AI-Enterprise-Control-Tower"
  Component   = "SecurityAgent"
  Environment = "POC"
}
