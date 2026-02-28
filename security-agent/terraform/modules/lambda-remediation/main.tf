# Lambda Remediation Module
# Handles autonomous playbooks for security remediation

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "poc"
}

variable "sqs_queue_arn" {
  description = "SQS queue ARN to trigger Lambda"
  type        = string
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

# IAM Role for Lambda
resource "aws_iam_role" "lambda_remediation" {
  name = "security-agent-remediation-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Lambda Execution Policy
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_remediation.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Custom Policy for Security Actions
resource "aws_iam_policy" "lambda_security_actions" {
  name = "security-agent-remediation-actions-${var.environment}"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ec2:DescribeSecurityGroups",
          "ec2:DescribeInstances",
          "ec2:CreateTags",
          "iam:ListUsers",
          "iam:ListRoles",
          "iam:ListPolicies",
          "s3:GetBucketPolicy",
          "s3:GetBucketPublicAccessBlock",
          "s3:ListBuckets",
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutBucketPublicAccessBlock"
        ]
        Resource = "arn:aws:s3:::*"
        Condition = {
          StringEquals = {
            "aws:PrincipalAccount" : var.source_account_id
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          "iam:CreatePolicy",
          "iam:DeleteUser",
          "iam:DetachUserPolicy",
          "iam:AttachUserPolicy"
        ]
        Resource = "arn:aws:iam::${var.source_account_id}:user/*"
      }
    ]
  })
}

variable "source_account_id" {
  description = "Source AWS account ID"
  type        = string
}

resource "aws_iam_role_policy_attachment" "lambda_security" {
  role       = aws_iam_role.lambda_remediation.name
  policy_arn = aws_iam_policy.lambda_security_actions.arn
}

# Lambda Function: Security Event Processor
resource "aws_lambda_function" "security_processor" {
  filename         = "${path.module}/function.zip"
  source_code_hash = filebase64sha256("${path.module}/function.zip")

  function_name = "security-agent-processor-${var.environment}"
  role          = aws_iam_role.lambda_remediation.arn
  runtime       = "python3.11"
  handler       = "handler.process_event"

  timeout     = 300  # 5 minutes
  memory_size = 256

  environment {
    variables = {
      ENVIRONMENT   = var.environment
      LOG_LEVEL     = "INFO"
      SLACK_WEBHOOK = ""  # Optional
    }
  }

  tags = {
    Environment = var.environment
    Component   = "SecurityAgent"
  }
}

# SQS Event Source Mapping
resource "aws_lambda_event_source_mapping" "sqs_trigger" {
  event_source_arn = var.sqs_queue_arn
  function_name    = aws_lambda_function.security_processor.function_name
  batch_size       = 10
  enabled          = true
}

# Output
output "lambda_function_name" {
  value = aws_lambda_function.security_processor.function_name
}

output "lambda_arn" {
  value = aws_lambda_function.security_processor.arn
}

output "lambda_role_arn" {
  value = aws_iam_role.lambda_remediation.arn
}
