# Falco Module for EC2
# Runtime security monitoring

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "poc"
}

variable "instance_ids" {
  description = "EC2 instance IDs to install Falco on"
  type        = list(string)
  default     = []
}

variable "eventbridge_bus" {
  description = "EventBridge bus for forwarding events"
  type        = string
}

# SSM Document for Falco Installation
resource "aws_ssm_document" "falco_install" {
  name           = "Falco-Install-${var.environment}"
  document_type  = "Command"
  document_format = "YAML"

  content = <<-YAML
    schemaVersion: "2.2"
    description: "Install Falco runtime security"
    parameters:
      instanceIds:
        type: StringList
        description: "Instance IDs to install Falco on"
    mainSteps:
      - name: InstallFalco
        action: aws:runCommand
        inputs:
          DocumentName: "AWS-RunShellScript"
          InstanceIds: "{{ instanceIds }}"
          Parameters:
            commands:
              - |
                # Add Falco GPG key
                curl -fsSL https://download.falco.org/falco.gpg | gpg --dearmor -o /usr/share/keyrings/falco.gpg
                
                # Add Falco repository
                echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/falco.gpg] https://download.falco.org/packages stable main" | tee /etc/apt/sources.list.d/falco.list
                
                # Update and install
                apt-get update -y
                apt-get install -y falco
                
                # Configure Falco to forward to EventBridge via Falco Sidekick
                cat > /etc/falco/falco.yaml << 'FALCO_CONFIG'
                rules_file:
                  - /etc/falco/falco-rules.yaml
                  - /etc/falco/falco.local.yaml
                
                json_output: true
                json_include_output_message_field: true
                log_level: info
                
                outputs:
                  webhook:
                    enabled: true
                    url: "http://localhost:2801/falco"
                
                falco_libs_dir: /usr/lib/falco
                FALCO_CONFIG
                
                # Install Falco Sidekick
                wget -q https://github.com/falcosecurity/falco-sidekick/releases/download/0.6.6/falco-sidekick_0.6.6_amd64.deb
                dpkg -i falco-sidekick_0.6.6_amd64.deb || apt-get install -f -y
                rm falco-sidekick_0.6.6_amd64.deb
                
                # Configure Sidekick
                cat > /etc/falco/falco-sidekick.yaml << 'SIDEKICK_CONFIG'
                webserver:
                  listen_port: 2801
                  Healthz: true
                
                outputs:
                  webhook:
                    enabled: true
                    url: "https://events.{{ region }}}.amazonaws.com/default"
                    method: POST
                    custom_headers:
                      - name: "Content-Type"
                        value: "application/cloudevents+json"
                
                events:
                  stdout: false
                  stderr: false
                SIDEKICK_CONFIG
                
                # Enable and start services
                systemctl enable falco
                systemctl enable falco-sidekick
                systemctl start falco-sidekick
                systemctl start falco
                
                echo "Falco installed successfully"
YAML

  tags = {
    Environment = var.environment
    Component   = "SecurityAgent"
  }
}

# SSM Document for Falco Uninstall
resource "aws_ssm_document" "falco_uninstall" {
  name           = "Falco-Uninstall-${var.environment}"
  document_type  = "Command"
  document_format = "YAML"

  content = <<-YAML
    schemaVersion: "2.2"
    description: "Uninstall Falco runtime security"
    parameters:
      instanceIds:
        type: StringList
        description: "Instance IDs to uninstall Falco from"
    mainSteps:
      - name: UninstallFalco
        action: aws:runCommand
        inputs:
          DocumentName: "AWS-RunShellScript"
          InstanceIds: "{{ instanceIds }}"
          Parameters:
            commands:
              - |
                systemctl stop falco || true
                systemctl stop falco-sidekick || true
                systemctl disable falco || true
                systemctl disable falco-sidekick || true
                apt-get remove -y falco falco-sidekick || true
                apt-get autoremove -y
                rm -f /etc/falco/falco.yaml
                rm -f /etc/falco/falco-sidekick.yaml
                echo "Falco uninstalled"
YAML

  tags = {
    Environment = var.environment
    Component   = "SecurityAgent"
  }
}

# Security Group for Falco (allows falco to communicate)
resource "aws_security_group" "falco" {
  name        = "falco-${var.environment}"
  description = "Security group for Falco agents"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Environment = var.environment
    Component   = "SecurityAgent"
  }
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

# Output
output "install_document_name" {
  value = aws_ssm_document.falco_install.name
}

output "uninstall_document_name" {
  value = aws_ssm_document.falco_uninstall.name
}

output "falco_security_group_id" {
  value = aws_security_group.falco.id
}
