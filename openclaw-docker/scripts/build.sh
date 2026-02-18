#!/bin/bash
# =============================================================================
# Build OpenClaw Docker Image
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/config.env"

if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
fi

REPO_DIR="${OPENCLAW_REPO_DIR:-/home/opencl02/openclaw-repo}"
IMAGE_NAME="${OPENCLAW_IMAGE:-openclaw:local}"

echo "Building OpenClaw image: $IMAGE_NAME"
echo "From: $REPO_DIR"

docker build -t "$IMAGE_NAME" -f "${REPO_DIR}/Dockerfile" "$REPO_DIR"

echo ""
echo "✅ Build complete!"
echo "Image: $IMAGE_NAME"
