# DomainFlow V3.0 Installation Guide

## Overview

This guide provides step-by-step instructions for installing and configuring DomainFlow V3.0 in various environments. DomainFlow V3.0 is designed for production deployment with containerized services and comprehensive configuration management.

## System Requirements

### Minimum Requirements

**Production Environment:**
- **CPU**: 4 cores (2.4 GHz or higher)
- **Memory**: 8 GB RAM
- **Storage**: 50 GB SSD storage
- **Network**: Stable internet connection with SSL/TLS support

**Development Environment:**
- **CPU**: 2 cores (2.0 GHz or higher)
- **Memory**: 4 GB RAM
- **Storage**: 20 GB available space
- **Network**: Internet connection for package downloads

### Software Dependencies

**Required Software:**
- **Docker**: 20.0+ and Docker Compose 2.0+
- **PostgreSQL**: 15+ (for database)
- **Node.js**: 18.0+ LTS (for frontend development)
- **Go**: 1.21+ (for backend development)

**Optional Software:**
- **Redis**: 7.0+ (for caching and session storage)
- **Nginx**: Latest (for reverse proxy in production)

## Installation Methods

### Method 1: Docker Compose (Recommended)

This is the recommended installation method for both development and production environments.

#### 1. Download and Setup

**Clone the Repository:**
```bash
git clone https://github.com/fntelecomllc/studio
cd studio
```

**Copy Environment Configuration:**
```bash
cp .env.example .env
```

#### 2. Configure Environment Variables

Edit the `.env` file with your configuration:

```bash
# .env
# ============================================================================
# DomainFlow V3.0 Configuration
# ============================================================================

# Environment
NODE_ENV=production
GIN_MODE=release

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:8080

# Backend Configuration
HOST=0.0.0.0
PORT=8080

# Database Configuration
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_NAME=domainflow
DATABASE_USER=domainflow
DATABASE_PASSWORD=secure_password_here
DATABASE_SSL_MODE=disable

# Session Configuration
SESSION_SECRET=generate_a_secure_random_string_here
SESSION_MAX_AGE=86400

# Security Configuration
BCRYPT_COST=12
PASSWORD_MIN_LENGTH=12

# Rate Limiting
RATE_LIMIT_REQUESTS_PER_MINUTE=60
RATE_LIMIT_BURST_SIZE=10

# Worker Configuration
WORKER_POOL_SIZE=10
MAX_CONCURRENT_CAMPAIGNS=5

# Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=json

# Health Check Configuration
HEALTH_CHECK_INTERVAL=30s
HEALTH_CHECK_TIMEOUT=10s
```

#### 3. Start Services

**Start all services:**
```bash
docker-compose up -d
```

**View service status:**
```bash
docker-compose ps
```

**View logs:**
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

#### 4. Initialize Database

**Run database migrations:**
```bash
docker-compose exec backend ./apiserver migrate
```

**Create initial admin user (optional):**
```bash
docker-compose exec backend ./apiserver create-admin \
  --email admin@domainflow.local \
  --password TempPassword123!
```

#### 5. Verify Installation

**Check service health:**
```bash
curl http://localhost:8080/health
curl http://localhost:3000
```

**Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- Health Check: http://localhost:8080/health

### Method 2: Manual Installation

For custom deployments or development environments.

#### 1. Database Setup

**Install PostgreSQL:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# CentOS/RHEL
sudo yum install postgresql-server postgresql-contrib

# macOS
brew install postgresql
```

**Create Database:**
```sql
-- Connect as postgres user
sudo -u postgres psql

-- Create database and user
CREATE DATABASE domainflow;
CREATE USER domainflow WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE domainflow TO domainflow;
\q
```

#### 2. Backend Installation

**Install Go (if not installed):**
```bash
# Download and install Go 1.21+
wget https://go.dev/dl/go1.21.0.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz

# Add to PATH
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc
```

**Build Backend:**
```bash
cd backend
go mod download
go build -o bin/apiserver cmd/apiserver/main.go
```

**Run Database Migrations:**
```bash
./bin/apiserver migrate --config config.yaml
```

**Start Backend Service:**
```bash
./bin/apiserver --config config.yaml
```

#### 3. Frontend Installation

**Install Node.js (if not installed):**
```bash
# Using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Or using NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

**Build Frontend:**
```bash
cd frontend
npm install
npm run build
```

**Start Frontend Service:**
```bash
npm start
```

### Method 3: Production Deployment

For production environments with high availability and scalability.

#### 1. Infrastructure Setup

**Recommended Architecture:**
```
Load Balancer (Nginx) → Frontend (Next.js) → Backend (Go) → Database (PostgreSQL)
                                     ↓
                                Cache (Redis)
```

#### 2. SSL/TLS Configuration

**Generate SSL Certificate:**
```bash
# Using Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

**Nginx Configuration:**
```nginx
# /etc/nginx/sites-available/domainflow
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket support
    location /ws {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

#### 3. Systemd Service Configuration

**Backend Service:**
```ini
# /etc/systemd/system/domainflow-backend.service
[Unit]
Description=DomainFlow Backend Service
After=network.target postgresql.service

[Service]
Type=simple
User=domainflow
WorkingDirectory=/opt/domainflow
ExecStart=/opt/domainflow/bin/apiserver
Restart=always
RestartSec=5
Environment=GIN_MODE=release

[Install]
WantedBy=multi-user.target
```

**Frontend Service:**
```ini
# /etc/systemd/system/domainflow-frontend.service
[Unit]
Description=DomainFlow Frontend Service
After=network.target

[Service]
Type=simple
User=domainflow
WorkingDirectory=/opt/domainflow/frontend
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

**Enable and Start Services:**
```bash
sudo systemctl enable domainflow-backend
sudo systemctl enable domainflow-frontend
sudo systemctl start domainflow-backend
sudo systemctl start domainflow-frontend

# Check status
sudo systemctl status domainflow-backend
sudo systemctl status domainflow-frontend
```

## Configuration

### Environment Variables

**Core Configuration:**
- `NODE_ENV`: Environment mode (development/production)
- `GIN_MODE`: Gin framework mode (debug/release)
- `HOST`: Server bind address
- `PORT`: Server port number

**Database Configuration:**
- `DATABASE_HOST`: PostgreSQL host
- `DATABASE_PORT`: PostgreSQL port
- `DATABASE_NAME`: Database name
- `DATABASE_USER`: Database username
- `DATABASE_PASSWORD`: Database password
- `DATABASE_SSL_MODE`: SSL mode (disable/require/verify-full)

**Security Configuration:**
- `SESSION_SECRET`: Session encryption key (generate random string)
- `BCRYPT_COST`: Password hashing cost (12-14 recommended)
- `PASSWORD_MIN_LENGTH`: Minimum password length

### Database Configuration

**Connection Pooling:**
```yaml
# config.yaml
database:
  host: localhost
  port: 5432
  name: domainflow
  user: domainflow
  password: secure_password
  ssl_mode: disable
  max_connections: 30
  min_connections: 5
  max_connection_lifetime: 1h
  max_connection_idle_time: 30m
```

**Performance Tuning:**
```sql
-- PostgreSQL configuration recommendations
-- /etc/postgresql/15/main/postgresql.conf

# Memory
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB

# Connections
max_connections = 100

# Performance
random_page_cost = 1.1
effective_io_concurrency = 200

# Logging
log_statement = 'mod'
log_duration = on
log_min_duration_statement = 1000
```

### Security Configuration

**Session Security:**
```yaml
session:
  secret: "generate-secure-random-string"
  max_age: 86400  # 24 hours
  secure: true    # HTTPS only
  http_only: true
  same_site: strict
```

**Rate Limiting:**
```yaml
rate_limit:
  requests_per_minute: 60
  burst_size: 10
  cleanup_interval: 1m
```

**Password Policy:**
```yaml
password:
  min_length: 12
  require_uppercase: true
  require_lowercase: true
  require_numbers: true
  require_symbols: true
  bcrypt_cost: 12
```

## Post-Installation Setup

### 1. Initial Configuration

**Create Admin User:**
```bash
# Using Docker
docker-compose exec backend ./apiserver create-admin \
  --email admin@your-domain.com \
  --password YourSecurePassword123!

# Manual installation
./bin/apiserver create-admin \
  --email admin@your-domain.com \
  --password YourSecurePassword123!
```

**Verify Installation:**
```bash
# Health checks
curl http://localhost:8080/health
curl http://localhost:8080/ping

# Database connectivity
curl http://localhost:8080/health/db

# Frontend availability
curl http://localhost:3000
```

### 2. Security Hardening

**Update Default Passwords:**
1. Change default database passwords
2. Generate secure session secrets
3. Configure SSL/TLS certificates
4. Enable firewall rules

**Firewall Configuration:**
```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw enable

# iptables
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
```

### 3. Monitoring Setup

**Log Configuration:**
```yaml
logging:
  level: info
  format: json
  output: /var/log/domainflow/app.log
  max_size: 100MB
  max_files: 10
  compress: true
```

**Health Monitoring:**
```bash
# Create monitoring script
cat > /opt/domainflow/scripts/health-check.sh << 'EOF'
#!/bin/bash
if curl -s http://localhost:8080/health | grep -q "healthy"; then
    echo "$(date): DomainFlow is healthy"
else
    echo "$(date): DomainFlow health check failed"
    systemctl restart domainflow-backend
fi
EOF

# Add to crontab
echo "*/5 * * * * /opt/domainflow/scripts/health-check.sh >> /var/log/domainflow/health.log" | crontab -
```

## Backup and Recovery

### Database Backup

**Automated Backup Script:**
```bash
#!/bin/bash
# /opt/domainflow/scripts/backup.sh

BACKUP_DIR="/opt/domainflow/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="domainflow"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create database backup
pg_dump -h localhost -U domainflow $DB_NAME | gzip > $BACKUP_DIR/domainflow_$DATE.sql.gz

# Remove backups older than 30 days
find $BACKUP_DIR -name "domainflow_*.sql.gz" -mtime +30 -delete

echo "Backup completed: domainflow_$DATE.sql.gz"
```

**Schedule Backups:**
```bash
# Add to crontab
echo "0 2 * * * /opt/domainflow/scripts/backup.sh" | crontab -
```

### Recovery Process

**Restore from Backup:**
```bash
# Stop services
sudo systemctl stop domainflow-backend domainflow-frontend

# Restore database
gunzip -c /opt/domainflow/backups/domainflow_YYYYMMDD_HHMMSS.sql.gz | \
  psql -h localhost -U domainflow domainflow

# Start services
sudo systemctl start domainflow-backend domainflow-frontend
```

## Troubleshooting

### Common Issues

**Service Won't Start:**
```bash
# Check logs
sudo journalctl -u domainflow-backend -f
sudo journalctl -u domainflow-frontend -f

# Check port availability
sudo netstat -tlnp | grep :8080
sudo netstat -tlnp | grep :3000
```

**Database Connection Issues:**
```bash
# Test database connectivity
psql -h localhost -U domainflow -d domainflow -c "SELECT version();"

# Check PostgreSQL status
sudo systemctl status postgresql
```

**Memory Issues:**
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head

# Check disk space
df -h
```

### Performance Optimization

**Database Optimization:**
```sql
-- Analyze table statistics
ANALYZE;

-- Reindex if needed
REINDEX DATABASE domainflow;

-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

**Application Optimization:**
```bash
# Monitor Go application
go tool pprof http://localhost:8080/debug/pprof/profile

# Monitor Node.js application
npm install -g clinic
clinic doctor -- npm start
```

## Updating DomainFlow

### Update Process

**Docker Deployment:**
```bash
# Pull latest images
docker-compose pull

# Stop services
docker-compose down

# Start with new images
docker-compose up -d

# Run migrations if needed
docker-compose exec backend ./apiserver migrate
```

**Manual Deployment:**
```bash
# Backup current installation
cp -r /opt/domainflow /opt/domainflow.backup

# Stop services
sudo systemctl stop domainflow-backend domainflow-frontend

# Update code
git pull origin main

# Build new binaries
cd backend && go build -o bin/apiserver cmd/apiserver/main.go
cd frontend && npm install && npm run build

# Run migrations
./bin/apiserver migrate

# Start services
sudo systemctl start domainflow-backend domainflow-frontend
```

## Support

### Getting Help

**Documentation:**
- [User Guide](USER_GUIDE.md) - End-user documentation
- [Developer Guide](DEVELOPER_GUIDE.md) - Development information
- [Architecture Guide](architecture/DOMAINFLOW_V3_ARCHITECTURE.md) - System architecture

**Community:**
- GitHub Issues: Report bugs and request features
- Documentation: Comprehensive guides and API documentation

**Commercial Support:**
- Enterprise support packages available
- Professional services for custom deployments
- Training and consulting services

---

## Conclusion

DomainFlow V3.0 is now installed and ready for use. For additional configuration options and advanced features, refer to the other documentation files in this repository.

**Next Steps:**
1. Review the [User Guide](USER_GUIDE.md) for usage instructions
2. Configure personas and proxies for domain validation
3. Create your first domain generation campaign
4. Set up monitoring and alerting for production environments

**DomainFlow V3.0 Stable** - Advanced Domain Intelligence Platform