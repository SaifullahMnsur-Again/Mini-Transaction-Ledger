#!/bin/bash

# ================================================================
# AZURE VM INITIAL SETUP SCRIPT
# ================================================================
# Purpose: Automate fresh Azure VM setup for Mini Transaction Ledger
# Requirements: Fresh Ubuntu 22.04 LTS or 24.04 LTS
# Run as: sudo bash setup-vm.sh
# Time: ~10-15 minutes
# ================================================================

set -e  # Exit on error

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
APP_USER="azureuser"
APP_DIR="/var/www/Mini-Transaction-Ledger"
DOCKER_VERSION="latest"

# Helper functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ================================================================
# PRE-FLIGHT CHECKS
# ================================================================

log_info "Running pre-flight checks..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "This script must be run as root (use sudo)"
    exit 1
fi

# Check OS
if ! grep -qi ubuntu /etc/os-release; then
    log_warning "This script is optimized for Ubuntu. Other distros may have issues."
fi

log_success "Pre-flight checks passed"

# ================================================================
# SYSTEM UPDATE
# ================================================================

log_info "Updating system packages (this may take a few minutes)..."
apt-get update -qq
apt-get upgrade -y -qq
apt-get autoremove -y -qq

log_success "System packages updated"

# ================================================================
# INSTALL DEPENDENCIES
# ================================================================

log_info "Installing system dependencies..."

apt-get install -y -qq \
    curl \
    wget \
    git \
    unzip \
    htop \
    net-tools \
    ufw \
    certbot \
    python3-certbot-nginx \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    software-properties-common

log_success "System dependencies installed"

# ================================================================
# INSTALL DOCKER
# ================================================================

log_info "Installing Docker..."

# Remove old Docker if exists
apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# Add Docker GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
    $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
apt-get update -qq
apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add user to docker group (avoid needing sudo for docker commands)
usermod -aG docker "${APP_USER}" 2>/dev/null || true

log_success "Docker installed"

# ================================================================
# INSTALL DOCKER COMPOSE (standalone)
# ================================================================

log_info "Installing Docker Compose..."

DOCKER_COMPOSE_URL="https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)"
curl -fsSL "${DOCKER_COMPOSE_URL}" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Verify installation
if docker-compose --version > /dev/null 2>&1; then
    log_success "Docker Compose installed: $(docker-compose --version)"
else
    log_error "Docker Compose installation failed"
    exit 1
fi

# ================================================================
# VERIFY DOCKER INSTALLATION
# ================================================================

log_info "Verifying Docker installation..."

if ! docker --version > /dev/null 2>&1; then
    log_error "Docker installation failed"
    exit 1
fi

log_success "Docker verified: $(docker --version)"

# Start Docker service
systemctl start docker
systemctl enable docker

log_success "Docker service started and enabled"

# ================================================================
# CREATE APPLICATION DIRECTORY
# ================================================================

log_info "Creating application directory..."

mkdir -p "${APP_DIR}"

# Create necessary subdirectories
mkdir -p "${APP_DIR}/backups"
mkdir -p "${APP_DIR}/logs"
mkdir -p "${APP_DIR}/ssl"
mkdir -p "${APP_DIR}/certbot-www"

# Set permissions
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"
chmod 750 "${APP_DIR}"
chmod 700 "${APP_DIR}/.env" 2>/dev/null || true

log_success "Application directory created: ${APP_DIR}"

# ================================================================
# CONFIGURE UFW FIREWALL
# ================================================================

log_info "Configuring UFW firewall..."

# Enable UFW
ufw --force enable > /dev/null 2>&1

# Allow SSH
ufw allow 22/tcp > /dev/null 2>&1
ufw allow 22/udp > /dev/null 2>&1

# Allow HTTP and HTTPS
ufw allow 80/tcp > /dev/null 2>&1
ufw allow 443/tcp > /dev/null 2>&1

# Deny all other inbound by default (already set, but be explicit)
ufw default deny incoming > /dev/null 2>&1
ufw default allow outgoing > /dev/null 2>&1

log_success "Firewall configured"
ufw status

# ================================================================
# CREATE SYSTEMD SERVICE (Optional - for auto-restart)
# ================================================================

log_info "Creating systemd service for auto-restart..."

cat > /etc/systemd/system/mini-ledger.service << 'SERVICE'
[Unit]
Description=Mini Transaction Ledger Docker Services
Requires=docker.service
After=docker.service
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
Restart=always
RestartSec=10
User=azureuser
WorkingDirectory=/var/www/Mini-Transaction-Ledger
ExecStart=/usr/local/bin/docker-compose -f docker-compose.yml up
ExecStop=/usr/local/bin/docker-compose -f docker-compose.yml down

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable mini-ledger.service

log_success "Systemd service created"

# ================================================================
# SETUP LOG ROTATION
# ================================================================

log_info "Setting up log rotation..."

cat > /etc/logrotate.d/mini-ledger << 'LOGROTATE'
/var/www/Mini-Transaction-Ledger/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    missingok
    create 0640 azureuser azureuser
}
LOGROTATE

log_success "Log rotation configured"

# ================================================================
# SETUP AUTOMATED BACKUPS
# ================================================================

log_info "Setting up automated backups..."

cat > /etc/cron.d/mini-ledger-backup << 'CRON'
# Mini Transaction Ledger Database Backup
# Run daily at 2 AM
0 2 * * * azureuser cd /var/www/Mini-Transaction-Ledger && bash deployment-scripts.sh backup >> /var/www/Mini-Transaction-Ledger/logs/backup.log 2>&1
CRON

chmod 644 /etc/cron.d/mini-ledger-backup

log_success "Automated backups configured"

# ================================================================
# CONFIGURE SWAP (Optional - for systems with low memory)
# ================================================================

log_info "Checking swap space..."

if [ "$(swapon --show | wc -l)" -le 1 ]; then
    log_warning "No swap detected. Creating 2GB swap file..."
    
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    
    # Add to fstab for persistence
    echo "/swapfile none swap sw 0 0" >> /etc/fstab
    
    log_success "Swap created and enabled"
else
    log_success "Swap already configured"
fi

# ================================================================
# SYSTEM LIMITS
# ================================================================

log_info "Configuring system limits..."

cat >> /etc/security/limits.conf << 'LIMITS'
# Docker limits
* soft nofile 65536
* hard nofile 65536
* soft nproc 32768
* hard nproc 32768
LIMITS

log_success "System limits configured"

# ================================================================
# NETWORK TUNING (Optional)
# ================================================================

log_info "Configuring network tuning..."

cat >> /etc/sysctl.conf << 'SYSCTL'
# Network tuning for Docker
net.core.somaxconn=32768
net.ipv4.tcp_max_syn_backlog=32768
net.ipv4.ip_local_port_range=1024 65535
SYSCTL

sysctl -p > /dev/null 2>&1

log_success "Network tuning configured"

# ================================================================
# FINAL CHECKS
# ================================================================

log_info "Running final checks..."

# Check disk space
DISK_USAGE=$(df "${APP_DIR}" | awk 'NR==2 {print int($5)}')
if [ "${DISK_USAGE}" -gt 80 ]; then
    log_warning "Disk usage is ${DISK_USAGE}% - consider cleaning up old backups"
else
    log_success "Disk space OK (${DISK_USAGE}% used)"
fi

# Check Docker daemon
if systemctl is-active --quiet docker; then
    log_success "Docker daemon is running"
else
    log_error "Docker daemon is not running"
    exit 1
fi

# Check docker-compose
if docker-compose --version > /dev/null 2>&1; then
    log_success "docker-compose is available"
else
    log_error "docker-compose is not available"
    exit 1
fi

# ================================================================
# SUMMARY
# ================================================================

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}     SETUP COMPLETED SUCCESSFULLY! ${GREEN}✓${NC}                   ${GREEN}║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

echo "📋 Summary:"
echo "   Application Dir: ${APP_DIR}"
echo "   Docker Version: $(docker --version)"
echo "   Docker Compose: $(docker-compose --version)"
echo "   UFW Status: $(ufw status | head -1)"
echo ""

echo "🚀 Next Steps:"
echo "   1. Navigate to application directory:"
echo "      cd ${APP_DIR}"
echo ""
echo "   2. Clone your repository:"
echo "      git clone -b devops-pipeline https://github.com/YOUR_USERNAME/Mini-Transaction-Ledger.git ."
echo ""
echo "   3. Create .env file from .env.example:"
echo "      cp .env.example .env"
echo "      nano .env  # Edit with your values"
echo ""
echo "   4. Create SSL certificate:"
echo "      mkdir -p ssl certbot-www"
echo "      docker run --rm -v \$(pwd)/ssl:/etc/letsencrypt -v \$(pwd)/certbot-www:/var/www/certbot \\"
echo "        certbot/certbot certonly --webroot -w /var/www/certbot \\"
echo "        --agree-tos --no-eff-email -d saifullahmnsur.dev -d www.saifullahmnsur.dev"
echo ""
echo "   5. Start Docker containers:"
echo "      docker-compose -f docker-compose.yml up -d --build"
echo ""
echo "   6. Check health:"
echo "      bash deployment-scripts.sh health_check"
echo ""
echo "   7. Visit your website:"
echo "      https://saifullahmnsur.dev"
echo ""

echo "📚 Useful Commands:"
echo "   View logs:        docker-compose logs -f backend"
echo "   Container status: docker-compose ps"
echo "   System stats:     docker stats --no-stream"
echo "   Backup database:  bash deployment-scripts.sh backup"
echo ""

echo "⚠️  Important:"
echo "   - Update .env with your actual values"
echo "   - Configure DNS to point to this VM's IP"
echo "   - SSL certificate needs DNS configured FIRST"
echo "   - Keep backups in safe location"
echo ""

log_success "Setup script completed!"