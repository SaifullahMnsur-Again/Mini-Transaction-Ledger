#!/bin/bash
# ==========================================
# AZURE VM SETUP SCRIPT
# ==========================================
# Run this once on your Azure VM for initial configuration
# Usage: bash setup-vm.sh

set -e

echo "🚀 Starting MiniTransactionLedger VM Setup..."

# ==========================================
# 1. UPDATE SYSTEM
# ==========================================
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install -y curl wget git nano htop

# ==========================================
# 2. INSTALL DOCKER & DOCKER COMPOSE
# ==========================================
echo "🐳 Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
rm get-docker.sh

# Add current user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify Docker installation
docker --version
docker compose version

# ==========================================
# 3. CREATE APPLICATION DIRECTORY
# ==========================================
APP_PATH="/var/www/Mini-Transaction-Ledger"
echo "📁 Creating application directory: $APP_PATH"
sudo mkdir -p $APP_PATH
sudo chown -R $USER:$USER $APP_PATH
cd $APP_PATH

# ==========================================
# 4. CLONE REPOSITORY
# ==========================================
echo "📥 Cloning repository..."
if [ -d ".git" ]; then
    echo "Repository already exists, pulling latest changes..."
    git pull origin main || git pull origin develop
else
    git clone -b main https://github.com/YOUR_GITHUB_USERNAME/Mini-Transaction-Ledger.git .
fi

# ==========================================
# 5. CREATE ENVIRONMENT FILES
# ==========================================
echo "⚙️  Creating environment files..."

cat > .env << 'EOF'
# PostgreSQL Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=CHANGE_THIS_PASSWORD
POSTGRES_DB=ledger_db

# Application Environment
ASPNETCORE_ENVIRONMENT=Production
NODE_ENV=production

# Domain
DOMAIN=your-domain.com
EOF

echo "⚠️  Please edit .env file with your actual credentials:"
echo "    nano .env"

# ==========================================
# 6. CREATE SSL DIRECTORIES
# ==========================================
echo "🔒 Creating SSL certificate directories..."
mkdir -p ssl
mkdir -p certbot-www
chmod 755 certbot-www

# ==========================================
# 7. GENERATE INITIAL SSL CERTIFICATE
# ==========================================
echo "🔐 Generating Let's Encrypt SSL certificate..."
echo "Please ensure your domain is pointed to this server's IP address."
echo "Your domain: $(grep DOMAIN .env | cut -d= -f2)"
echo ""

read -p "Press ENTER to continue with SSL certificate generation..."

# Create initial certificate
docker run --rm -v "$(pwd)/ssl:/etc/letsencrypt" \
    -v "$(pwd)/certbot-www:/var/www/certbot" \
    certbot/certbot certonly \
    --webroot -w /var/www/certbot \
    --agree-tos \
    --no-eff-email \
    --email your-email@example.com \
    -d $(grep DOMAIN .env | cut -d= -f2) \
    -d www.$(grep DOMAIN .env | cut -d= -f2)

echo "✅ SSL certificate generated successfully!"

# ==========================================
# 8. CONFIGURE FIREWALL
# ==========================================
echo "🔥 Configuring UFW firewall..."
sudo apt-get install -y ufw

# Enable UFW
sudo ufw enable

# Allow SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Deny all other ports
sudo ufw default deny incoming
sudo ufw default allow outgoing

echo "✅ Firewall configured!"

# ==========================================
# 9. SET UP LOG ROTATION
# ==========================================
echo "📋 Setting up log rotation..."
sudo tee /etc/logrotate.d/docker-compose > /dev/null << EOF
$APP_PATH/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 root root
    sharedscripts
    postrotate
        docker compose -f $APP_PATH/docker-compose-prod.yml kill -s SIGUSR1 nginx 2>/dev/null || true
    endscript
}
EOF

# ==========================================
# 10. CREATE SYSTEMD SERVICE (OPTIONAL)
# ==========================================
echo "🔧 Creating systemd service..."
sudo tee /etc/systemd/system/mini-ledger.service > /dev/null << EOF
[Unit]
Description=Mini Transaction Ledger
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$APP_PATH
ExecStart=/usr/bin/docker compose -f docker-compose-prod.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose-prod.yml down
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable mini-ledger.service

# ==========================================
# 11. CREATE BACKUP SCRIPT
# ==========================================
echo "💾 Creating backup script..."
mkdir -p scripts
cat > scripts/backup.sh << 'BACKUP_EOF'
#!/bin/bash
BACKUP_DIR="/var/www/Mini-Transaction-Ledger/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/ledger_db_backup_$TIMESTAMP.sql"

mkdir -p "$BACKUP_DIR"

# Backup PostgreSQL database
docker exec ledger-db pg_dump -U postgres ledger_db > "$BACKUP_FILE"
gzip "$BACKUP_FILE"

# Keep only last 30 days of backups
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete

echo "✅ Database backed up: ${BACKUP_FILE}.gz"
BACKUP_EOF

chmod +x scripts/backup.sh

# Add backup to crontab (daily at 2 AM)
(crontab -l 2>/dev/null | grep -v 'backup.sh'; echo "0 2 * * * $APP_PATH/scripts/backup.sh") | crontab -

# ==========================================
# 12. CREATE MONITORING SCRIPT
# ==========================================
echo "📊 Creating monitoring script..."
cat > scripts/health-check.sh << 'HEALTH_EOF'
#!/bin/bash
HEALTH_LOG="/var/www/Mini-Transaction-Ledger/logs/health-check.log"

mkdir -p "$(dirname "$HEALTH_LOG")"

echo "[$(date)] Running health checks..." >> "$HEALTH_LOG"

# Check backend
if ! curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "[$(date)] ❌ Backend health check failed" >> "$HEALTH_LOG"
    exit 1
fi

# Check frontend
if ! curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "[$(date)] ❌ Frontend health check failed" >> "$HEALTH_LOG"
    exit 1
fi

# Check database
if ! docker exec ledger-db pg_isready -U postgres > /dev/null 2>&1; then
    echo "[$(date)] ❌ Database health check failed" >> "$HEALTH_LOG"
    exit 1
fi

echo "[$(date)] ✅ All services healthy" >> "$HEALTH_LOG"
HEALTH_EOF

chmod +x scripts/health-check.sh

# ==========================================
# 13. PRINT SUMMARY
# ==========================================
echo ""
echo "================================"
echo "✅ VM Setup Complete!"
echo "================================"
echo ""
echo "📝 Next steps:"
echo "  1. Edit environment variables:"
echo "     nano /var/www/Mini-Transaction-Ledger/.env"
echo ""
echo "  2. Update Nginx configuration:"
echo "     nano /var/www/Mini-Transaction-Ledger/nginx.conf"
echo "     (Replace 'your-domain.com' with your actual domain)"
echo ""
echo "  3. Start the application:"
echo "     cd /var/www/Mini-Transaction-Ledger"
echo "     docker compose -f docker-compose-prod.yml up -d"
echo ""
echo "  4. Verify it's running:"
echo "     docker compose -f docker-compose-prod.yml ps"
echo ""
echo "📊 Useful commands:"
echo "  View logs:     docker compose -f docker-compose-prod.yml logs -f"
echo "  Check status:  /var/www/Mini-Transaction-Ledger/scripts/health-check.sh"
echo "  Backup DB:     /var/www/Mini-Transaction-Ledger/scripts/backup.sh"
echo ""
echo "🔗 Access your app at: https://your-domain.com"
echo ""