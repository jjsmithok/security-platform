#!/usr/bin/env python3
"""
Security Agent - Event Processor
Handles autonomous playbooks for security remediation

Playbooks:
1. S3 Public Access Detection - Check and alert on public buckets
2. IAM Policy Drift - Detect unauthorized IAM changes
3. Security Group Analysis - Flag overly permissive rules
"""

import json
import os
import logging
import boto3
from datetime import datetime

# Configure logging
logging.basicConfig(level=os.environ.get('LOG_LEVEL', 'INFO'))
logger = logging.getLogger(__name__)

# AWS Clients
s3 = boto3.client('s3')
iam = boto3.client('iam')
ec2 = boto3.client('ec2')
logs = boto3.client('logs')

ENVIRONMENT = os.environ.get('ENVIRONMENT', 'poc')


def log_event(event_type: str, details: dict):
    """Log event to CloudWatch"""
    try:
        logger.info(f"{event_type}: {json.dumps(details)}")
    except Exception as e:
        logger.error(f"Failed to log event: {e}")


def playbook_s3_public_access(event_detail: dict) -> dict:
    """
    Playbook 1: S3 Public Access Detection
    Analyzes S3 bucket policy changes and checks for public access
    """
    bucket_name = event_detail.get('requestParameters', {}).get('bucketName', '')
    
    if not bucket_name:
        # Try to extract from different event structures
        bucket_name = event_detail.get('resources', [{}])[0].get('ARN', '').split(':')[-1] or ''
    
    result = {
        'playbook': 's3_public_access',
        'bucket': bucket_name,
        'action': 'checked',
        'status': 'safe'
    }
    
    if bucket_name:
        try:
            # Check bucket policy
            policy = s3.get_bucket_policy(Bucket=bucket_name)
            policy_text = json.dumps(policy.get('Policy', '{}'))
            
            # Check for public access
            if '"Principal": "*"' in policy_text and '"Effect": "Allow"' in policy_text:
                result['status'] = 'warning'
                result['message'] = 'Bucket policy allows public access'
                result['recommendation'] = 'Review and remove public access grants'
                
        except s3.exceptions.NoSuchBucketPolicy:
            result['status'] = 'safe'
            result['message'] = 'No bucket policy - bucket is private'
            
    return result


def playbook_iam_policy_change(event_detail: dict) -> dict:
    """
    Playbook 2: IAM Policy Drift Detection
    Monitors IAM policy changes and alerts on unauthorized modifications
    """
    event_name = event_detail.get('eventName', '')
    user_arn = event_detail.get('userIdentity', {}).get('arn', 'Unknown')
    
    result = {
        'playbook': 'iam_policy_change',
        'event': event_name,
        'user': user_arn,
        'action': 'logged',
        'status': 'info'
    }
    
    # Check for high-risk IAM actions
    high_risk_actions = [
        'PutUserPolicy',
        'PutGroupPolicy', 
        'PutRolePolicy',
        'AttachUserPolicy',
        'AttachGroupPolicy',
        'AttachRolePolicy'
    ]
    
    if event_name in high_risk_actions:
        result['status'] = 'warning'
        result['message'] = f'High-risk IAM action: {event_name}'
        result['recommendation'] = 'Review IAM policy change in CloudTrail'
        
    return result


def playbook_security_group_change(event_detail: dict) -> dict:
    """
    Playbook 3: Security Group Analysis
    Analyzes security group changes for overly permissive rules
    """
    event_name = event_detail.get('eventName', '')
    sg_id = event_detail.get('requestParameters', {}).get('groupId', '')
    
    result = {
        'playbook': 'security_group_change',
        'event': event_name,
        'security_group': sg_id,
        'action': 'analyzed',
        'status': 'info'
    }
    
    if event_name in ['AuthorizeSecurityGroupIngress', 'AuthorizeSecurityGroupEgress']:
        # Get the IP permissions
        ip_permissions = event_detail.get('requestParameters', {}).get('ipPermissions', {})
        
        # Check for overly permissive rules
        for perm in ip_permissions.get('items', []):
            ip_ranges = perm.get('ipRanges', {}).get('items', [])
            for ip_range in ip_ranges:
                cidr = ip_range.get('cidrIp', '')
                if cidr == '0.0.0.0/0':
                    result['status'] = 'warning'
                    result['message'] = 'Security group allows traffic from 0.0.0.0/0'
                    result['recommendation'] = 'Restrict to specific IP ranges'
                    
    return result


def playbook_guardduty_finding(event_detail: dict) -> dict:
    """
    Playbook 4: GuardDuty Finding Response
    Handles GuardDuty security findings
    """
    finding_type = event_detail.get('findingType', 'Unknown')
    severity = event_detail.get('severity', 0)
    
    result = {
        'playbook': 'guardduty_finding',
        'finding_type': finding_type,
        'severity': severity,
        'action': 'logged',
        'status': 'info'
    }
    
    # High severity findings
    if severity >= 7.0:
        result['status'] = 'critical'
        result['message'] = f'High severity GuardDuty finding: {finding_type}'
        result['recommendation'] = 'Immediate investigation required'
    elif severity >= 4.0:
        result['status'] = 'warning'
        result['message'] = f'Medium severity GuardDuty finding: {finding_type}'
        result['recommendation'] = 'Review within 24 hours'
        
    return result


def route_to_playbook(event: dict) -> dict:
    """Route event to appropriate playbook"""
    
    detail = event.get('detail', {})
    event_source = event.get('source', '')
    detail_type = event.get('detail-type', '')
    
    # Route based on event source
    if event_source == 'aws.s3':
        return playbook_s3_public_access(detail)
    
    elif event_source == 'aws.iam':
        return playbook_iam_policy_change(detail)
    
    elif event_source == 'aws.ec2':
        return playbook_security_group_change(detail)
    
    elif event_source == 'aws.guardduty':
        return playbook_guardduty_finding(detail)
    
    else:
        return {
            'playbook': 'unknown',
            'status': 'info',
            'message': f'Unhandled event source: {event_source}'
        }


def process_sqs_message(message: dict) -> dict:
    """Process a single SQS message"""
    
    try:
        # Parse the event from SQS body
        body = json.loads(message.get('body', '{}'))
        
        # EventBridge wraps events in 'detail'
        event = body
        
        # Route to appropriate playbook
        result = route_to_playbook(event)
        
        # Log the result
        log_event('playbook_executed', result)
        
        return {
            'statusCode': 200,
            'body': json.dumps(result)
        }
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse message: {e}")
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Invalid JSON'})
        }
    except Exception as e:
        logger.error(f"Error processing message: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }


def process_event(event, context):
    """
    Lambda handler function
    Processes security events from SQS
    """
    
    logger.info(f"Processing event: {json.dumps(event)}")
    
    results = []
    
    # Handle SQS trigger
    if 'Records' in event:
        for record in event['Records']:
            result = process_sqs_message(record)
            results.append(result)
    else:
        # Direct invocation
        result = route_to_playbook(event)
        results.append(result)
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'processed': len(results),
            'results': results
        })
    }


if __name__ == '__main__':
    # Test event
    test_event = {
        'source': 'aws.s3',
        'detail-type': 'AWS API Call via CloudTrail',
        'detail': {
            'eventName': 'PutBucketPolicy',
            'requestParameters': {
                'bucketName': 'test-bucket'
            }
        }
    }
    
    print(json.dumps(process_event(test_event, None), indent=2))
