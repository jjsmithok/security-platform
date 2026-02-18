#!/bin/bash
# =============================================================================
# OpenClaw Docker Deploy Script
# Usage: ./deploy.sh [instance-name]
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/config.env"
TEMPLATE_FILE="${SCRIPT_DIR}/templates/docker-compose.yml.template"
DEPLOY_DIR="${SCRIPT_DIR}/deployments"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Functions
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if config exists
if [ ! -f "$CONFIG_FILE" ]; then
    log_error "Config file not found: $CONFIG_FILE"
    log_info "Copy config.env.example to config.env and fill in your values"
    exit 1
fi

# Load config
source "$CONFIG_FILE"

# Validate required vars
if [ -z "$OPENCLAW_GATEWAY_TOKEN" ]; then
    log_error "OPENCLAW_GATEWAY_TOKEN is required"
    exit 1
fi

if [ -z "$MINIMAX_API_KEY" ]; then
    log_error "MINIMAX_API_KEY is required"
    exit 1
fi

# Set defaults
CONTAINER_NAME_PREFIX="${CONTAINER_NAME_PREFIX:-openclaw}"
GATEWAY_HOST_PORT="${GATEWAY_HOST_PORT:-18790}"
GATEWAY_CONTAINER_PORT="${GATEWAY_CONTAINER_PORT:-18789}"
OPENCLAW_GATEWAY_BIND="${OPENCLAW_GATEWAY_BIND:-lan}"

# Create deployment directory
INSTANCE_DIR="${DEPLOY_DIR}/${CONTAINER_NAME_PREFIX}"
mkdir -p "$INSTANCE_DIR"

log_info "Deploying OpenClaw container: ${CONTAINER_NAME_PREFIX}"
log_info "Host port: ${GATEWAY_HOST_PORT} -> Container port: ${GATEWAY_CONTAINER_PORT}"

# Generate docker-compose.yml from template
envsubst < "$TEMPLATE_FILE" > "${INSTANCE_DIR}/docker-compose.yml"
cp "$CONFIG_FILE" "${INSTANCE_DIR}/.env"

# Check if image exists
if ! docker image inspect "$OPENCLAW_IMAGE" > /dev/null 2>&1; then
    log_warn "Image '$OPENCLAW_IMAGE' not found. Building..."
    if [ -d "$OPENCLAW_REPO_DIR" ]; then
        docker build -t "$OPENCLAW_IMAGE" -f "${OPENCLAW_REPO_DIR}/Dockerfile" "$OPENCLAW_REPO_DIR"
    else
        log_error "Repo directory not found: $OPENCLAW_REPO_DIR"
        exit 1
    fi
fi

# Stop existing containers
cd "$INSTANCE_DIR"
docker compose down 2>/dev/null || true

# Start containers
log_info "Starting containers..."
docker compose up -d

# Wait for container to be ready
log_info "Waiting for gateway to start..."
sleep 5

# Check status
if curl -s -o /dev/null -f "http://localhost:${GATEWAY_HOST_PORT}/" 2>/dev/null; then
    log_info "✅ Deployment successful!"
    echo ""
    echo "========================================"
    echo "  🚀 OpenClaw Docker Deployment Ready"
    echo "========================================"
    echo ""
    echo "  Dashboard: http://localhost:${GATEWAY_HOST_PORT}/"
    echo "  Token:     ${OPENCLAW_GATEWAY_TOKEN}"
    echo ""
    echo "  CLI:       cd ${INSTANCE_DIR} && docker compose run --rm openclaw-cli <command>"
    echo ""
else
    log_warn "Container may not be fully ready yet. Check logs with:"
    echo "  cd ${INSTANCE_DIR} && docker compose logs -f"
fi
