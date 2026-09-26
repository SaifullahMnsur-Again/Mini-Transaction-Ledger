```bash
#!/usr/bin/env bash

set -Eeuo pipefail

# ============================================================
# Mini Transaction Ledger - Azure VM Setup
# Repository : SaifullahMnsur-Again/Mini-Transaction-Ledger
# Branch     : devops-pipeline
# Compose    : docker-compose.yml ONLY
# ============================================================

APP_PATH="/var/www/Mini-Transaction-Ledger"

REPO_URL="https://github.com/SaifullahMnsur-Again/Mini-Transaction-Ledger.git"
BRANCH="devops-pipeline"
COMPOSE_FILE="docker-compose.yml"

DOMAIN="ledger.saifullahmnsur.dev"

ENV_FILE="$APP_PATH/.env"
SSL_DIR="$APP_PATH/ssl"
CERTBOT_WEBROOT="$APP_PATH/certbot-www"
LOG_DIR="$APP_PATH/logs"
BACKUP_DIR="$APP_PATH/backups"
SCRIPT_DIR="$APP_PATH/scripts"

SYSTEMD_SERVICE="/etc/systemd/system/mini-transaction-ledger.service"

# ============================================================
# Colors
# ============================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============================================================
# Helper functions
# ============================================================

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

section() {
    echo
    echo -e "${BLUE}============================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================================${NC}"
    echo
}

cleanup_on_error() {
    error "Setup failed at line $1."
    exit 1
}

trap 'cleanup_on_error $LINENO' ERR

# ============================================================
# Start
# ============================================================

section "Mini Transaction Ledger - VM Setup"

log "Application path : $APP_PATH"
log "Repository       : $REPO_URL"
log "Git branch       : $BRANCH"
log "Compose file     : $COMPOSE_FILE"
log "Domain           : $DOMAIN"

# ============================================================
# Check OS
# ============================================================

section "Checking operating system"

if [[ ! -f /etc/os-release ]]; then
    error "Cannot determine operating system."
    exit 1
fi

source /etc/os-release

log "Detected OS: ${PRETTY_NAME:-Unknown}"

# ============================================================
# Check sudo
# ============================================================

section "Checking sudo access"

if ! sudo -n true 2>/dev/null; then
    log "Sudo password may be required."
    sudo -v
fi

log "Sudo access confirmed."

# ============================================================
# System update and packages
# ============================================================

section "Updating system packages"

sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y

log "Installing required packages..."

sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
    ca-certificates \
    curl \
    wget \
    git \
    nano \
    htop \
    ufw \
    logrotate \
    openssl

log "Required packages installed."

# ============================================================
# Docker installation
# ============================================================

section "Checking Docker"

if command -v docker >/dev/null 2>&1; then
    log "Docker is already installed."
else
    log "Docker is not installed. Installing Docker..."

    curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
    sudo sh /tmp/get-docker.sh
    rm -f /tmp/get-docker.sh

    log "Docker installation completed."
fi

sudo systemctl enable docker
sudo systemctl start docker

log "Docker service is running."

# ============================================================
# Docker Compose check
# ============================================================

section "Checking Docker Compose"

if sudo docker compose version >/dev/null 2>&1; then
    log "Docker Compose is available."
    sudo docker compose version
else
    error "Docker Compose is not available."
    exit 1
fi

# ============================================================
# Docker group
# ============================================================

section "Configuring Docker permissions"

if id -nG "$USER" | grep -qw docker; then
    log "User $USER is already in the docker group."
else
    sudo usermod -aG docker "$USER"
    warn "User $USER has been added to the docker group."
    warn "Log out and reconnect after setup for group membership to take effect."
fi

# ============================================================
# Application directory
# ============================================================

section "Preparing application directory"

sudo mkdir -p "$APP_PATH"

sudo chown -R "$USER":"$USER" "$APP_PATH"

cd "$APP_PATH"

# ============================================================
# Clone / update repository
# ONLY devops-pipeline branch
# ============================================================

section "Setting up Git repository"

if [[ ! -d "$APP_PATH/.git" ]]; then

    log "Cloning repository branch: $BRANCH"

    # Clone ONLY the required branch.
    git clone \
        --branch "$BRANCH" \
        --single-branch \
        "$REPO_URL" \
        "$APP_PATH"

else

    log "Existing Git repository detected."

    git remote set-url origin "$REPO_URL"

    log "Fetching ONLY branch: $BRANCH"

    git fetch origin "$BRANCH"

    log "Checking out branch: $BRANCH"

    git checkout -B "$BRANCH" "origin/$BRANCH"

    log "Synchronizing working tree with origin/$BRANCH"

    git reset --hard "origin/$BRANCH"

    git clean -fd
fi

cd "$APP_PATH"

CURRENT_BRANCH="$(git branch --show-current)"

if [[ "$CURRENT_BRANCH" != "$BRANCH" ]]; then
    error "Unexpected Git branch: $CURRENT_BRANCH"
    error "Expected branch: $BRANCH"
    exit 1
fi

log "Current Git branch: $CURRENT_BRANCH"

CURRENT_COMMIT="$(git rev-parse --short HEAD)"
log "Current commit: $CURRENT_COMMIT"

# ============================================================
# Verify compose file
# ============================================================

section "Checking Docker Compose configuration"

if [[ ! -f "$APP_PATH/$COMPOSE_FILE" ]]; then
    error "$COMPOSE_FILE was not found in $APP_PATH"
    exit 1
fi

log "Found: $APP_PATH/$COMPOSE_FILE"

sudo docker compose \
    -f "$APP_PATH/$COMPOSE_FILE" \
    config >/dev/null

log "Docker Compose configuration is valid."

# ============================================================
# Environment file
# ============================================================

section "Configuring environment"

if [[ ! -f "$ENV_FILE" ]]; then

    log "Creating $ENV_FILE"

    cat > "$ENV_FILE" <<EOF
# ============================================================
# Mini Transaction Ledger - Production Environment
# ============================================================

ASPNETCORE_ENVIRONMENT=Production
NODE_ENV=production

# Application
DOMAIN=$DOMAIN

# PostgreSQL
POSTGRES_DB=ledger_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=CHANGE_THIS_PASSWORD

# Database connection
DATABASE_URL=postgresql://postgres:CHANGE_THIS_PASSWORD@ledger-db:5432/ledger_db
EOF

    chmod 600 "$ENV_FILE"

    warn "A new .env file was created."
    warn "IMPORTANT: Edit $ENV_FILE and change the database password."
else
    log "$ENV_FILE already exists. Keeping existing configuration."
fi

# ============================================================
# Required directories
# ============================================================

section "Creating application directories"

mkdir -p \
    "$SSL_DIR" \
    "$CERTBOT_WEBROOT" \
    "$LOG_DIR" \
    "$BACKUP_DIR" \
    "$SCRIPT_DIR"

chmod 700 "$SSL_DIR"
chmod 700 "$BACKUP_DIR"

log "Application directories created."

# ============================================================
# Git ignore protection
# ============================================================

section "Protecting environment and runtime files"

GITIGNORE="$APP_PATH/.gitignore"

touch "$GITIGNORE"

add_gitignore_entry() {
    local entry="$1"

    if ! grep -Fxq "$entry" "$GITIGNORE"; then
        echo "$entry" >> "$GITIGNORE"
    fi
}

add_gitignore_entry ".env"
add_gitignore_entry "ssl/"
add_gitignore_entry "certbot-www/"
add_gitignore_entry "logs/"
add_gitignore_entry "backups/"

log ".gitignore configured."

# ============================================================
# Firewall
# ============================================================

section "Configuring UFW firewall"

sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

if sudo ufw status | grep -q "Status: active"; then
    log "UFW is already active."
else
    warn "Enabling UFW."
    sudo ufw --force enable
fi

sudo ufw status verbose

# ============================================================
# Logrotate
# ============================================================

section "Configuring log rotation"

sudo tee /etc/logrotate.d/mini-transaction-ledger >/dev/null <<EOF
$LOG_DIR/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
EOF

log "Logrotate configuration created."

# ============================================================
# Database backup script
# ============================================================

section "Creating database backup script"

cat > "$SCRIPT_DIR/backup-database.sh" <<'EOF'
#!/usr/bin/env bash

set -Eeuo pipefail

APP_PATH="/var/www/Mini-Transaction-Ledger"
COMPOSE_FILE="docker-compose.yml"
BACKUP_DIR="$APP_PATH/backups/database"

mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date '+%Y-%m-%d_%H-%M-%S')"
BACKUP_FILE="$BACKUP_DIR/ledger_db_$TIMESTAMP.sql"

cd "$APP_PATH"

echo "[INFO] Creating PostgreSQL backup..."

sudo docker exec ledger-db \
    pg_dump \
    -U postgres \
    -d ledger_db \
    > "$BACKUP_FILE"

gzip "$BACKUP_FILE"

echo "[INFO] Backup created:"
echo "$BACKUP_FILE.gz"

# Keep only the latest 14 compressed backups.
find "$BACKUP_DIR" \
    -type f \
    -name "*.sql.gz" \
    -mtime +14 \
    -delete

echo "[INFO] Database backup completed."
EOF

chmod +x "$SCRIPT_DIR/backup-database.sh"

# ============================================================
# Health check script
# ============================================================

section "Creating health check script"

cat > "$SCRIPT_DIR/health-check.sh" <<'EOF'
#!/usr/bin/env bash

set -u

APP_PATH="/var/www/Mini-Transaction-Ledger"
COMPOSE_FILE="docker-compose.yml"

cd "$APP_PATH"

echo "============================================================"
echo "Mini Transaction Ledger - Health Check"
echo "============================================================"

echo
echo "[Docker]"
sudo docker version --format 'Server: {{.Server.Version}}' 2>/dev/null || true

echo
echo "[Compose Services]"
sudo docker compose -f "$COMPOSE_FILE" ps

echo
echo "[Backend]"
if curl -fsS --max-time 10 http://127.0.0.1:8000/health >/dev/null 2>&1; then
    echo "Backend health: OK"
else
    echo "Backend health: FAILED"
fi

echo
echo "[Frontend]"
if curl -fsS --max-time 10 http://127.0.0.1:3000/ >/dev/null 2>&1; then
    echo "Frontend health: OK"
else
    echo "Frontend health: FAILED"
fi

echo
echo "[Nginx / HTTP]"
if curl -fsS --max-time 10 http://127.0.0.1/ >/dev/null 2>&1; then
    echo "Nginx HTTP: OK"
else
    echo "Nginx HTTP: FAILED"
fi

echo
echo "[PostgreSQL]"
if sudo docker exec ledger-db pg_isready -U postgres -d ledger_db >/dev/null 2>&1; then
    echo "PostgreSQL: OK"
else
    echo "PostgreSQL: FAILED"
fi

echo
echo "[Docker Resource Usage]"
sudo docker stats --no-stream || true

echo
echo "============================================================"
EOF

chmod +x "$SCRIPT_DIR/health-check.sh"

# ============================================================
# Systemd service
# ONLY docker-compose.yml
# ============================================================

section "Creating systemd service"

sudo tee "$SYSTEMD_SERVICE" >/dev/null <<EOF
[Unit]
Description=Mini Transaction Ledger Docker Compose Application
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$APP_PATH

ExecStart=/usr/bin/docker compose -f $COMPOSE_FILE up -d
ExecStop=/usr/bin/docker compose -f $COMPOSE_FILE down

TimeoutStartSec=0
TimeoutStopSec=120

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable mini-transaction-ledger.service

log "Systemd service configured."

# ============================================================
# SSL note
# ============================================================

section "SSL configuration"

warn "Initial Let's Encrypt certificate issuance is NOT performed yet."
warn "The application/Nginx must first be running and DNS must point to this VM."
warn "After HTTP on port 80 is working, use deployment-scripts.sh update_ssl."
warn "This avoids requesting a certificate before the ACME challenge can be served."

# ============================================================
# Final compose validation
# ============================================================

section "Final Docker Compose validation"

sudo docker compose \
    -f "$APP_PATH/$COMPOSE_FILE" \
    config >/dev/null

log "Compose configuration validated successfully."

# ============================================================
# Final summary
# ============================================================

section "VM Setup Completed"

echo "Application path : $APP_PATH"
echo "Repository       : $REPO_URL"
echo "Git branch       : $BRANCH"
echo "Git commit       : $(git rev-parse --short HEAD)"
echo "Compose file     : $COMPOSE_FILE"
echo "Environment      : $ENV_FILE"
echo "SSL directory    : $SSL_DIR"
echo "Systemd service  : mini-transaction-ledger.service"

echo
echo "Next steps:"
echo
echo "1. Edit the environment file:"
echo "   nano $ENV_FILE"
echo
echo "2. Make sure DNS points your domain to this Azure VM."
echo
echo "3. Make sure Azure NSG allows:"
echo "   TCP 22"
echo "   TCP 80"
echo "   TCP 443"
echo
echo "4. Start the application:"
echo "   sudo docker compose -f $COMPOSE_FILE up -d --build"
echo
echo "5. Check services:"
echo "   sudo docker compose -f $COMPOSE_FILE ps"
echo
echo "6. Run health check:"
echo "   bash $SCRIPT_DIR/health-check.sh"
echo
echo "7. After HTTP is working, issue/renew SSL using:"
echo "   bash $APP_PATH/deployment-scripts.sh update_ssl"
echo
echo "8. If you were added to the docker group, log out and reconnect."
echo
echo -e "${GREEN}Setup completed successfully.${NC}"
```
