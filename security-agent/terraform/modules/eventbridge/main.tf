# EventBridge Security Events Module
# Routes CloudTrail and security events to SQS for processing

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "poc"
}

variable "source_account_id" {
  description = "Source AWS account ID"
  type        = string
}

# EventBridge Bus
resource "aws_cloudwatch_event_bus" "security" {
  name = "security-events-${var.environment}"

  tags = {
    Environment = var.environment
    Component   = "SecurityAgent"
  }
}

# SQS Queue for security events
resource "aws_sqs_queue" "security_events" {
  name                       = "security-events-${var.environment}"
  message_retention_seconds  = 86400  # 24 hours
  receive_wait_time_seconds  = 20

  tags = {
    Environment = var.environment
    Component   = "SecurityAgent"
  }
}

# SQS Dead Letter Queue
resource "aws_sqs_queue" "security_events_dlq" {
  name = "security-events-${var.environment}-dlq"

  tags = {
    Environment = var.environment
    Component   = "SecurityAgent"
  }
}

# EventBridge Rule: IAM Changes
resource "aws_cloudwatch_event_rule" "iam_changes" {
  name           = "security-iam-changes-${var.environment}"
  description    = "Capture IAM policy changes"
  event_bus_name = aws_cloudwatch_event_bus.security.name

  event_pattern = jsonencode({
    "source" : ["aws.iam"],
    "detail-type" : ["AWS API Call via CloudTrail"],
    "detail" : {
      "eventSource" : ["iam.amazonaws.com"],
      "eventName" : ["PutUserPolicy", "PutGroupPolicy", "PutRolePolicy", "AttachUserPolicy", "AttachGroupPolicy", "AttachRolePolicy"]
    }
  })

  tags = {
    Environment = var.environment
    Component   = "SecurityAgent"
  }
}

# EventBridge Rule: Security Group Changes
resource "aws_cloudwatch_event_rule" "sg_changes" {
  name           = "security-sg-changes-${var.environment}"
  description    = "Capture Security Group changes"
  event_bus_name = aws_cloudwatch_event_bus.security.name

  event_pattern = jsonencode({
    "source" : ["aws.ec2"],
    "detail-type" : ["AWS API Call via CloudTrail"],
    "detail" : {
      "eventSource" : ["ec2.amazonaws.com"],
      "eventName" : ["AuthorizeSecurityGroupIngress", "AuthorizeSecurityGroupEgress", "RevokeSecurityGroupIngress", "RevokeSecurityGroupEgress", "CreateSecurityGroup"]
    }
  })

  tags = {
    Environment = var.environment
    Component   = "SecurityAgent"
  }
}

# EventBridge Rule: S3 Public Access
resource "aws_cloudwatch_event_rule" "s3_changes" {
  name           = "security-s3-changes-${var.environment}"
  description    = "Capture S3 bucket policy changes"
  event_bus_name = aws_cloudwatch_event_bus.security.name

  event_pattern = jsonencode({
    "source" : ["aws.s3"],
    "detail-type" : ["AWS API Call via CloudTrail"],
    "detail" : {
      "eventSource" : ["s3.amazonaws.com"],
      "eventName" : ["PutBucketPolicy", "PutBucketAcl", "PutBucketPublicAccessBlock"]
    }
  })

  tags = {
    Environment = var.environment
    Component   = "SecurityAgent"
  }
}

# EventBridge Rule: GuardDuty Findings
resource "aws_cloudwatch_event_rule" "guardduty" {
  name           = "security-guardduty-${var.environment}"
  description    = "Capture GuardDuty findings"
  event_bus_name = aws_cloudwatch_event_bus.security.name

  event_pattern = jsonencode({
    "source" : ["aws.guardduty"]
  })

  tags = {
    Environment = var.environment
    Component   = "SecurityAgent"
  }
}

# Event Targets: Send all rules to SQS
resource "aws_cloudwatch_event_target" "iam_sqs" {
  rule           = aws_cloudwatch_event_rule.iam_changes.name
  event_bus_name = aws_cloudwatch_event_bus.security.name
  target_id      = "security-events-sqs"
  arn            = aws_sqs_queue.security_events.arn
}

resource "aws_cloudwatch_event_target" "sg_sqs" {
  rule           = aws_cloudwatch_event_rule.sg_changes.name
  event_bus_name = aws_cloudwatch_event_bus.security.name
  target_id      = "security-events-sqs"
  arn            = aws_sqs_queue.security_events.arn
}

resource "aws_cloudwatch_event_target" "s3_sqs" {
  rule           = aws_cloudwatch_event_rule.s3_changes.name
  event_bus_name = aws_cloudwatch_event_bus.security.name
  target_id      = "security-events-sqs"
  arn            = aws_sqs_queue.security_events.arn
}

resource "aws_cloudwatch_event_target" "guardduty_sqs" {
  rule           = aws_cloudwatch_event_rule.guardduty.name
  event_bus_name = aws_cloudwatch_event_bus.security.name
  target_id      = "security-events-sqs"
  arn            = aws_sqs_queue.security_events.arn
}

# SQS Policy to allow EventBridge to send messages
resource "aws_sqs_queue_policy" "security_events" {
  queue_url = aws_sqs_queue.security_events.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowEventBridge"
        Effect    = "Allow"
        Principal = "*"
        Action    = "sqs:SendMessage"
        Resource  = aws_sqs_queue.security_events.arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" : aws_cloudwatch_event_bus.security.arn
          }
        }
      }
    ]
  })
}

# Output
output "event_bus_name" {
  value = aws_cloudwatch_event_bus.security.name
}

output "sqs_queue_url" {
  value = aws_sqs_queue.security_events.id
}

output "sqs_queue_arn" {
  value = aws_sqs_queue.security_events.arn
}
