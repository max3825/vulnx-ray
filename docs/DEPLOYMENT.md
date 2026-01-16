# VulnX-Ray Production Deployment Guide

This guide covers deploying VulnX-Ray in a production environment with best practices for security, performance, and reliability.

---

## Prerequisites

- Docker 20.10+ and Docker Compose 2.0+
- Domain name with DNS configured
- SSL/TLS certificate (Let's Encrypt recommended)
- Minimum 2GB RAM, 2 CPU cores
- 20GB disk space

---

## Quick Production Deploy

```bash
git clone https://github.com/max3825/vulnx-ray.git
cd vulnx-ray
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration
docker compose -f docker-compose.prod.yml up -d
```

---

## Environment Configuration

### 1. Create Production Environment File

```bash
cd backend
cp .env.example .env
nano .env
```

### 2. Configure Essential Variables

```env
# Database (production should use PostgreSQL or MySQL)
DATABASE_URL=sqlite:///./vulnx ray.db

# SMTP for email alerts
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
SMTP_FROM_EMAIL=vulnxray@yourdomain.com
ENABLE_EMAIL_ALERTS=true

# Security
SECRET_KEY=generate-a-strong-random-key-here
JWT_SECRET_KEY=generate-another-strong-random-key-here
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Alert configuration
ALERT_CHECK_INTERVAL=3600

# Logging
LOG_LEVEL=WARNING
```

**Generate secure keys**:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## Docker Compose Production Setup

### 1. Use Production Configuration

The `docker-compose.prod.yml` includes:
- Named volumes for data persistence
- Resource limits
- Health checks
- Restart policies
- Logging configuration

### 2. Start Services

```bash
docker compose -f docker-compose.prod.yml up -d
```

### 3. Verify Services

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
```

---

## Reverse Proxy Configuration

### Nginx Configuration

Create `/etc/nginx/sites-available/vulnxray`:

```nginx
upstream backend {
    server localhost:8000;
}

upstream frontend {
    server localhost:3000;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS Configuration
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Rate limiting (optional)
        limit_req zone=api burst=20 nodelay;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://backend/health;
        access_log off;
    }

    # API docs
    location /docs {
        proxy_pass http://backend/docs;
    }

    # Max upload size
    client_max_body_size 10M;
}

# Rate limiting zone
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
```

Enable and restart Nginx:
```bash
ln -s /etc/nginx/sites-available/vulnxray /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

---

## SSL/TLS with Let's Encrypt

### 1. Install Certbot

```bash
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx
```

### 2. Obtain Certificate

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 3. Auto-renewal

Certbot automatically configures renewal. Verify:
```bash
sudo certbot renew --dry-run
```

---

## Database Backup

### SQLite Backup

Create backup script `/usr/local/bin/backup-vulnxray.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/vulnxray"
DB_PATH="/path/to/vulnx-ray/backend/vulnxray.db"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
cp $DB_PATH $BACKUP_DIR/vulnxray_$DATE.db
gzip $BACKUP_DIR/vulnxray_$DATE.db

# Keep only last 30 days
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
```

Make executable and schedule:
```bash
chmod +x /usr/local/bin/backup-vulnxray.sh
crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-vulnxray.sh
```

### PostgreSQL Migration (Optional)

For larger deployments, migrate to PostgreSQL:

1. Install PostgreSQL:
```bash
sudo apt-get install postgresql postgresql-contrib
```

2. Create database:
```bash
sudo -u postgres createdb vulnxray
sudo -u postgres createuser vulnxray_user
```

3. Update `.env`:
```env
DATABASE_URL=postgresql://vulnxray_user:password@localhost/vulnxray
```

4. Install psycopg2:
```bash
pip install psycopg2-binary
```

---

## Monitoring & Logging

### Docker Logs

View logs:
```bash
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
```

### Log Rotation

Docker automatically rotates logs with configured settings in `docker-compose.prod.yml`.

### Health Monitoring

Use the `/health` endpoint for monitoring:

```bash
curl https://yourdomain.com/health
```

Integrate with monitoring tools:
- **Uptime Robot**: HTTP monitoring
- **Prometheus**: Metrics export (future)
- **Grafana**: Dashboard visualization (future)

---

## Security Hardening

### 1. Firewall Configuration

```bash
# UFW example
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### 2. Fail2Ban for SSH

```bash
sudo apt-get install fail2ban
sudo systemctl enable fail2ban
```

### 3. Database Security

- Use strong passwords
- Restrict database access to localhost
- Regular backups
- Enable SSL for database connections (PostgreSQL)

### 4. Application Security

- Set strong `SECRET_KEY` and `JWT_SECRET_KEY`
- Configure `ALLOWED_HOSTS` correctly
- Enable HTTPS only
- Regular security updates

---

## Performance Optimization

### 1. Enable Caching (Future)

Redis caching for search results:
```yaml
# docker-compose.prod.yml
redis:
  image: redis:7-alpine
  restart: unless-stopped
```

### 2. Database Optimization

For PostgreSQL:
```sql
CREATE INDEX idx_cve_id ON cve_sources(cve_id);
CREATE INDEX idx_severity ON cve_sources(severity);
VACUUM ANALYZE;
```

### 3. Resource Limits

Adjust in `docker-compose.prod.yml`:
```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
    reservations:
      cpus: '1'
      memory: 1G
```

---

## Scaling

### Horizontal Scaling

For high traffic, scale the backend:

```bash
docker compose -f docker-compose.prod.yml up -d --scale backend=3
```

Use a load balancer (Nginx, HAProxy) to distribute traffic.

### Vertical Scaling

Increase container resources in `docker-compose.prod.yml`.

---

## Updates & Maintenance

### Update Application

```bash
cd vulnx-ray
git pull origin main
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

### Database Migrations

```bash
# Backup first!
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

---

## Troubleshooting

### Container Won't Start

Check logs:
```bash
docker compose -f docker-compose.prod.yml logs backend
```

### Database Connection Issues

Verify database is accessible and credentials are correct in `.env`.

### High Memory Usage

Check resource limits and adjust in `docker-compose.prod.yml`.

### API Not Responding

1. Check backend health: `curl http://localhost:8000/health`
2. Verify Nginx configuration: `nginx -t`
3. Check firewall rules

---

## Support

For production deployment issues:
- Open an issue on GitHub
- Check existing documentation
- Review logs carefully

---

**Production deployment requires careful planning and security considerations. Always test in a staging environment first!**
