# Security Policies Module
# AWS Config rules for continuous compliance

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "poc"
}

variable "s3_bucket_name" {
  description = "S3 bucket for Config recordings"
  type        = string
}

# IAM Role for AWS Config
resource "aws_iam_role" "config_recorder" {
  name = "aws-config-recorder-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "config.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "config_recorder" {
  role       = aws_iam_role.config_recorder.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSConfigRole"
}

# AWS Config Recorder
resource "aws_config_configuration_recorder" "main" {
  name     = "security-config-${var.environment}"
  role_arn = aws_iam_role.config_recorder.arn

  recording_group {
    all_supported                 = true
    include_global_resource_types = true
  }
}

# S3 Bucket for Config (if not provided)
resource "aws_s3_bucket" "config" {
  count = var.s3_bucket_name == "" ? 1 : 0
  bucket = "security-config-${var.environment}-${data.aws_caller_identity.current.account_id}"

  tags = {
    Environment = var.environment
    Component   = "SecurityAgent"
  }
}

data "aws_caller_identity" "current" {}

resource "aws_s3_bucket_server_side_encryption_configuration" "config" {
  count = var.s3_bucket_name == "" ? 1 : 0
  bucket = aws_s3_bucket.config[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "config" {
  count = var.s3_bucket_name == "" ? 1 : 0
  bucket = aws_s3_bucket.config[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Use the provided bucket or the created one
locals {
  config_bucket = var.s3_bucket_name != "" ? var.s3_bucket_name : aws_s3_bucket.config[0].id
}

# AWS Config Delivery Channel
resource "aws_config_delivery_channel" "main" {
  name           = "security-config-${var.environment}"
  s3_bucket_name = local.config_bucket
}

# AWS Config Rules (using aws_config_config_rule)
# 1. S3 Bucket Public Access
resource "aws_config_config_rule" "s3_public_access" {
  name = "s3-bucket-public-access-${var.environment}"

  source {
    owner             = "AWS"
    source_identifier = "S3_BUCKET_PUBLIC_READ_PROHIBITED"
  }
}

# 2. IAM Password Policy
resource "aws_config_config_rule" "iam_password_policy" {
  name = "iam-password-policy-${var.environment}"

  source {
    owner             = "AWS"
    source_identifier = "IAM_PASSWORD_POLICY"
  }
}

# 3. CloudTrail Enabled
resource "aws_config_config_rule" "cloudtrail_enabled" {
  name = "cloudtrail-enabled-${var.environment}"

  source {
    owner             = "AWS"
    source_identifier = "CLOUDTRAIL_ENABLED"
  }
}

# 4. Restricted SSH
resource "aws_config_config_rule" "security_group_rssh" {
  name = "security-group-rdp-ssh-${var.environment}"

  source {
    owner             = "AWS"
    source_identifier = "INCOMING_SSH_DISABLED"
  }
}

# 5. VPC Flow Logs
resource "aws_config_config_rule" "vpc_flow_logs" {
  name = "vpc-flow-logs-enabled-${var.environment}"

  source {
    owner             = "AWS"
    source_identifier = "VPC_FLOW_LOGS_ENABLED"
  }
}

# 6. Unused IAM Keys
resource "aws_config_config_rule" "iam_no_unused_keys" {
  name = "iam-user-unused-keys-${var.environment}"

  source {
    owner             = "AWS"
    source_identifier = "IAM_USER_UNUSED_CREDENTIALS"
  }
}

# SNS Topic for Config Alerts
resource "aws_sns_topic" "security_alerts" {
  name = "security-alerts-${var.environment}"

  tags = {
    Environment = var.environment
    Component   = "SecurityAgent"
  }
}

# Output
output "config_recorder_name" {
  value = aws_config_configuration_recorder.main.name
}

output "sns_topic_arn" {
  value = aws_sns_topic.security_alerts.arn
}

output "config_bucket_name" {
  value = local.config_bucket
}
