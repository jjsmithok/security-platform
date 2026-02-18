# 🐙 OpenClaw Docker Deployment Kit

Fast, repeatable deployment of OpenClaw in Docker containers.

## 📁 Structure

```
openclaw-docker-deployment/
├── config.env                    # Main configuration (copy from .env.example)
├── templates/
│   └── docker-compose.yml.template
├── scripts/
│   ├── deploy.sh                 # Main deployment script
│   ├── build.sh                  # Build Docker image
│   ├── stop.sh                   # Stop containers
│   └── quick-deploy.sh           # Add new instance quickly
└── deployments/                  # Generated deployment configs
    └── openclaw/
        ├── docker-compose.yml
        └── .env
```

## 🚀 Quick Start

### 1. Configure

```bash
cd /home/opencl02/openclaw-docker-deployment
cp config.env config.env.backup  # backup existing
# Edit config.env with your values
nano config.env
```

### 2. Build Image (first time)

```bash
./scripts/build.sh
```

### 3. Deploy

```bash
./scripts/deploy.sh
```

## ➕ Add Additional Instance

```bash
# Usage: ./quick-deploy.sh <name> <port>
./scripts/quick-deploy.sh openclaw-2 18791
./scripts/quick-deploy.sh openclaw-3 18792
```

## 📋 Configuration Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENCLAW_GATEWAY_TOKEN` | ✅ | Gateway auth token |
| `MINIMAX_API_KEY` | ✅ | AI provider API key |
| `OPENCLAW_IMAGE` | ✅ | Docker image name |
| `GATEWAY_HOST_PORT` | ✅ | Host port (e.g., 18790) |
| `GATEWAY_CONTAINER_PORT` | ✅ | Container port (usually 18789) |
| `CONTAINER_NAME_PREFIX` | | Container name prefix |
| `OPENCLAW_CONFIG_DIR` | | Path to config on host |
| `OPENCLAW_WORKSPACE_DIR` | | Path to workspace on host |
| `OPENCLAW_REPO_DIR` | | Path to OpenClaw repo |
| `OPENCLAW_GATEWAY_BIND` | | Bind address (loopback/lan/0.0.0.0) |

## 🔧 Plesk Docker Extension Notes

When deploying on Plesk:

1. **Disable Automatic port mapping** in container settings
2. **Use Manual mapping:**
   - Instance 1: `18789:18789`
   - Instance 2: `18790:18789`
   - Instance 3: `18791:18789`
3. Or use the `quick-deploy.sh` script which handles this

## 🛠️ Scripts

| Script | Usage |
|--------|-------|
| `build.sh` | Build Docker image |
| `deploy.sh` | Deploy container |
| `stop.sh` | Stop containers |
| `quick-deploy.sh <name> <port>` | Add new instance |

## 📝 Example config.env

```bash
# Required
OPENCLAW_GATEWAY_TOKEN=your-token-here
MINIMAX_API_KEY=sk-xxx

# Container
OPENCLAW_IMAGE=openclaw:local
CONTAINER_NAME_PREFIX=openclaw
GATEWAY_HOST_PORT=18790
GATEWAY_CONTAINER_PORT=18789

# Paths
OPENCLAW_CONFIG_DIR=/home/opencl02/.openclaw
OPENCLAW_WORKSPACE_DIR=/home/opencl02/.openclaw/workspace
OPENCLAW_REPO_DIR=/home/opencl02/openclaw-repo

# Network
OPENCLAW_GATEWAY_BIND=lan
```

## 🔑 Access (after deploy)

- **Dashboard:** `http://<host>:<port>/`
- **Token:** From config.env
- **CLI:** `docker compose -f deployments/<name>/docker-compose.yml run --rm openclaw-cli <command>`

## ⚠️ Important Notes

1. **Port Conflicts:** Each instance needs unique host port
2. **Config Sharing:** All instances share same `OPENCLAW_CONFIG_DIR` by default
3. **For isolated configs:** Create separate config directories per instance
4. **Permissions:** Container runs as root (`user: "0:0"`) for config access
