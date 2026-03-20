# Weathify Deployment Guide

## Table of Contents
1. [Pre-Deployment Checklist](#1-pre-deployment-checklist)
2. [Generating Secrets](#2-generating-secrets)
3. [Spotify App Configuration](#3-spotify-app-configuration)
4. [Heroku](#4-heroku)
5. [Railway](#5-railway)
6. [DigitalOcean Droplet (Manual)](#6-digitalocean-droplet-manual)
7. [Post-Deployment Steps](#7-post-deployment-steps)
8. [Monitoring & Logs](#8-monitoring--logs)
9. [Rollback](#9-rollback)

---

## 1. Pre-Deployment Checklist

- [ ] `.env` values are **not** committed to git (check `.gitignore`)
- [ ] Default admin password has been changed
- [ ] `SPOTIFY_REDIRECT_URI` points to the production domain
- [ ] `FRONTEND_URL` points to the production domain
- [ ] `NODE_ENV=production` is set
- [ ] Database schema has been applied
- [ ] SSL/HTTPS is active on the domain
- [ ] Rate limits reviewed for expected traffic

---

## 2. Generating Secrets
```bash
# JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 3. Spotify App Configuration

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Open your app → **Edit Settings**
3. Add to **Redirect URIs** (recommended):
```
  https://yourdomain.com/callback
```
4. Save changes
5. Update `SPOTIFY_REDIRECT_URI` in your production environment

---

## 4. Heroku

### Install CLI & Login
```bash
npm install -g heroku
heroku login
```

### Create App & Database
```bash
heroku create your-app-name
heroku addons:create heroku-postgresql:mini
```

### Set Environment Variables
```bash
heroku config:set NODE_ENV=production
heroku config:set PORT=3000
heroku config:set SPOTIFY_CLIENT_ID=xxx
heroku config:set SPOTIFY_CLIENT_SECRET=xxx
heroku config:set SPOTIFY_REDIRECT_URI=https://your-app-name.herokuapp.com/callback
heroku config:set OPENWEATHER_API_KEY=xxx
heroku config:set JWT_SECRET=xxx
heroku config:set SESSION_SECRET=xxx
heroku config:set FRONTEND_URL=https://your-app-name.herokuapp.com
```

### Deploy
```bash
git push heroku main
```

### Run Database Schema
```bash
heroku pg:psql < database/schema.sql
```

### Seed Admin and Songs (optional)
```bash
# From a one-off dyno, after your config vars are set:
heroku run node database/seed_admin.js --reset
heroku run node database/seed_songs.js
```

### Verify
```bash
heroku open
heroku logs --tail
```

---

## 5. Railway

### Install CLI & Deploy
```bash
npm install -g @railway/cli
railway login
railway init
railway add postgresql
```

### Set Variables
```bash
railway variables set NODE_ENV=production
railway variables set SPOTIFY_CLIENT_ID=xxx
# ... set all remaining variables
```

### Deploy & Run Schema
```bash
railway up
# Get DATABASE_URL from dashboard, then:
psql $DATABASE_URL < database/schema.sql
```

---

## 6. DigitalOcean Droplet (Manual)

### Server Setup
```bash
# Connect to droplet
ssh root@YOUR_IP

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt update && sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql && sudo systemctl start postgresql

# Create database
sudo -u postgres psql -c "CREATE DATABASE weathify_db;"
sudo -u postgres psql -c "CREATE USER weathify WITH PASSWORD 'strong_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE weathify_db TO weathify;"

# Clone repo
git clone https://github.com/YOUR/weathify.git /var/www/weathify
cd /var/www/weathify
npm install
cp .env.example .env
nano .env   # fill in all values

# Run schema
psql -U weathify -d weathify_db < database/schema.sql

# Optional: create/reset admin user (uses ADMIN_* env vars if set)
node database/seed_admin.js --reset

# Optional: seed sample songs from Spotify (requires SPOTIFY_* env)
node database/seed_songs.js
```

### PM2 Process Manager
```bash
npm install -g pm2
pm2 start server.js --name weathify
pm2 save
pm2 startup   # follow printed instructions
```

### Nginx Reverse Proxy
```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/weathify
```

Paste:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/weathify /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### SSL with Let's Encrypt
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
# Auto-renewal is configured automatically
```

---

## 7. Post-Deployment Steps

### Change Admin Password
```bash
# Use the seeder to (re)set the admin password
ADMIN_PASS="YOUR_NEW_PASSWORD" node database/seed_admin.js --reset
```

### Seed the Database (optional)
```bash
# Seed admin (if not already done)
node database/seed_admin.js --reset

# Seed songs (requires valid SPOTIFY_* credentials)
node database/seed_songs.js
```

### Smoke Tests
```bash
# Health check
curl https://yourdomain.com/health

# Should return:
# {"status":"healthy","timestamp":"...","uptime":...}
```

---

## 8. Monitoring & Logs

### Health Endpoint
`GET /health` — returns `{ status, timestamp, uptime }`

Use with UptimeRobot, BetterUptime, or Pingdom for free monitoring.

### Log Commands
```bash
# Heroku
heroku logs --tail

# PM2
pm2 logs weathify

# Systemd
journalctl -u weathify -f
```

### Database Backups
```bash
# Manual backup
pg_dump -U weathify weathify_db > backup_$(date +%Y%m%d).sql

# Heroku automatic
heroku pg:backups:schedule --at '03:00 UTC'
heroku pg:backups:capture   # manual
```

---

## 9. Rollback

### Heroku
```bash
heroku releases          # list releases
heroku rollback v42      # roll back to specific release
```

### PM2 / Manual
```bash
git checkout tags/v1.0.0   # check out previous tag
npm install
pm2 restart weathify
```