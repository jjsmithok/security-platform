#!/bin/bash
# =============================================================================
# Quick Deploy - Add New OpenClaw Instance
# Usage: ./quick-deploy.sh <instance-name> <host-port>
# Example: ./quick-deploy.sh openclaw-2 18791
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/config.env"

if [ -z "$1" ]; then
    echo "Usage: $0 <instance-name> <host-port>"
    echo "Example: $0 openclaw-2 18791"
    exit 1
fi

INSTANCE_NAME="$1"
HOST_PORT="${2:-18791}"

# Source base config
if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
fi

# Override for this instance
export CONTAINER_NAME_PREFIX="$INSTANCE_NAME"
export GATEWAY_HOST_PORT="$HOST_PORT"

# Create instance-specific config
DEPLOY_DIR="${SCRIPT_DIR}/deployments/${INSTANCE_NAME}"
mkdir -p "$DEPLOY_DIR"

# Generate docker-compose
envsubst < "${SCRIPT_DIR}/templates/docker-compose.yml.template" > "${DEPLOY_DIR}/docker-compose.yml"

# Copy env with overridden values
cat > "${DEPLOY_DIR}/.env" << EOF
OPENCLAW_IMAGE=${OPENCLAW_IMAGE:-openclaw:local}
OPENCLAW_GATEWAY_TOKEN=${OPENCLAW_GATEWAY_TOKEN}
MINIMAX_API_KEY=${MINIMAX_API_KEY}
CONTAINER_NAME_PREFIX=${CONTAINER_NAME_PREFIX}
GATEWAY_HOST_PORT=${GATEWAY_HOST_PORT}
GATEWAY_CONTAINER_PORT=${GATEWAY_CONTAINER_PORT:-18789}
OPENCLAW_CONFIG_DIR=${OPENCLAW_CONFIG_DIR}
OPENCLAW_WORKSPACE_DIR=${OPENCLAW_WORKSPACE_DIR}
OPENCLAW_REPO_DIR=${OPENCLAW_REPO_DIR}
OPENCLAW_GATEWAY_BIND=${OPENCLAW_GATEWAY_BIND:-lan}
EOF

echo "🚀 Deploying $INSTANCE_NAME on port $HOST_PORT..."

cd "$DEPLOY_DIR"
docker compose up -d

echo ""
echo "✅ Deployed: $INSTANCE_NAME"
echo "   Dashboard: http://localhost:$HOST_PORT/"
