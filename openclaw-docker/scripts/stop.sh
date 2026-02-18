#!/bin/bash
# =============================================================================
# Stop OpenClaw Docker Containers
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/config.env"

if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
fi

DEPLOY_DIR="${SCRIPT_DIR}/deployments"
INSTANCE="${CONTAINER_NAME_PREFIX:-openclaw}"

if [ -d "${DEPLOY_DIR}/${INSTANCE}" ]; then
    cd "${DEPLOY_DIR}/${INSTANCE}"
    docker compose down
    echo "✅ Stopped: $INSTANCE"
else
    echo "Instance not found: $INSTANCE"
    echo "Available in: $DEPLOY_DIR"
    ls -la "$DEPLOY_DIR" 2>/dev/null || echo "No deployments yet"
fi
