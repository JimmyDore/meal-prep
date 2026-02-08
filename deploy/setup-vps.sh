#!/usr/bin/env bash
#
# VPS Setup Script for Meal Prep Application
# ============================================
#
# This script guides you through setting up a fresh VPS for the meal-prep app.
# It is designed for Ubuntu 22.04+ / Debian 12+.
#
# BEFORE RUNNING:
#   1. Update the variables below (DOMAIN, DEPLOY_USER, REPO_URL, APP_DIR)
#   2. Ensure you have root or sudo access on the VPS
#   3. Point your domain's DNS A record to this VPS IP address
#
# USAGE:
#   chmod +x deploy/setup-vps.sh
#   sudo ./deploy/setup-vps.sh
#
# You can also run steps individually by reading through and copying commands.
#

set -euo pipefail

# ==============================================================================
# CONFIGURATION - Update these values before running
# ==============================================================================

DOMAIN="mealprep.example.com"      # Your actual domain/subdomain
DEPLOY_USER="deploy"               # Non-root user for running the app
REPO_URL="git@github.com:YOUR_USER/meal-prep.git"  # Your repo SSH URL
APP_DIR="/home/${DEPLOY_USER}/meal-prep"            # Where the app lives

# Database credentials for production
POSTGRES_DB="mealprep"
POSTGRES_USER="mealprep"
# POSTGRES_PASSWORD will be generated automatically if not set
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)}"

# ==============================================================================
# Pre-flight checks
# ==============================================================================

echo "=============================================="
echo " Meal Prep VPS Setup"
echo "=============================================="
echo ""
echo " Domain:       ${DOMAIN}"
echo " Deploy user:  ${DEPLOY_USER}"
echo " App dir:      ${APP_DIR}"
echo " Repo:         ${REPO_URL}"
echo ""

if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: This script must be run as root (or with sudo)."
  exit 1
fi

read -rp "Continue with these settings? (y/N) " confirm
if [[ ! "${confirm}" =~ ^[Yy]$ ]]; then
  echo "Aborted. Edit the variables at the top of this script and re-run."
  exit 0
fi

# ==============================================================================
# Step 1: System packages
# ==============================================================================

echo ""
echo "--- Step 1: Installing system packages ---"

apt-get update -y
apt-get install -y \
  curl \
  git \
  nginx \
  certbot \
  python3-certbot-nginx \
  ufw

# Install Docker if not present
if ! command -v docker &>/dev/null; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
fi

# Ensure Docker Compose plugin is available
if ! docker compose version &>/dev/null; then
  echo "ERROR: Docker Compose plugin not available. Please install Docker Compose v2."
  exit 1
fi

echo "System packages installed."

# ==============================================================================
# Step 2: Create deploy user
# ==============================================================================

echo ""
echo "--- Step 2: Creating deploy user ---"

if id "${DEPLOY_USER}" &>/dev/null; then
  echo "User '${DEPLOY_USER}' already exists, skipping creation."
else
  adduser --disabled-password --gecos "" "${DEPLOY_USER}"
  echo "User '${DEPLOY_USER}' created."
fi

# Add to docker group so deploy user can run docker commands
usermod -aG docker "${DEPLOY_USER}"
echo "User '${DEPLOY_USER}' added to docker group."

# ==============================================================================
# Step 3: Setup SSH key for deploy user
# ==============================================================================

echo ""
echo "--- Step 3: Setting up SSH access ---"

DEPLOY_HOME="/home/${DEPLOY_USER}"
SSH_DIR="${DEPLOY_HOME}/.ssh"

mkdir -p "${SSH_DIR}"
chmod 700 "${SSH_DIR}"

if [ ! -f "${SSH_DIR}/authorized_keys" ]; then
  touch "${SSH_DIR}/authorized_keys"
fi
chmod 600 "${SSH_DIR}/authorized_keys"
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${SSH_DIR}"

echo ""
echo "ACTION REQUIRED: Add your SSH public key to ${SSH_DIR}/authorized_keys"
echo "  On your local machine, run:"
echo "    ssh-copy-id -i ~/.ssh/id_ed25519.pub ${DEPLOY_USER}@$(hostname -I | awk '{print $1}')"
echo ""
echo "  Or manually paste your public key into: ${SSH_DIR}/authorized_keys"
echo ""

# ==============================================================================
# Step 4: Clone repository
# ==============================================================================

echo ""
echo "--- Step 4: Cloning repository ---"

if [ -d "${APP_DIR}" ]; then
  echo "Directory ${APP_DIR} already exists, skipping clone."
  echo "To update: cd ${APP_DIR} && git pull"
else
  # Clone as deploy user
  sudo -u "${DEPLOY_USER}" git clone "${REPO_URL}" "${APP_DIR}" || {
    echo ""
    echo "NOTE: Git clone failed. This is normal if:"
    echo "  - The repo is private and SSH keys aren't set up on the VPS yet"
    echo "  - You need to add a deploy key to GitHub"
    echo ""
    echo "To fix:"
    echo "  1. Generate a deploy key: sudo -u ${DEPLOY_USER} ssh-keygen -t ed25519 -f ${DEPLOY_HOME}/.ssh/id_ed25519 -N ''"
    echo "  2. Add the public key to GitHub: Settings > Deploy keys"
    echo "  3. Re-run this step: sudo -u ${DEPLOY_USER} git clone ${REPO_URL} ${APP_DIR}"
    echo ""
  }
fi

# ==============================================================================
# Step 5: Create production .env
# ==============================================================================

echo ""
echo "--- Step 5: Creating production .env ---"

ENV_FILE="${APP_DIR}/.env.production"

if [ -f "${ENV_FILE}" ]; then
  echo ".env.production already exists at ${ENV_FILE}, skipping."
else
  if [ -d "${APP_DIR}" ]; then
    cat > "${ENV_FILE}" <<ENVEOF
# Production environment variables
NODE_ENV=production

# Database
POSTGRES_DB=${POSTGRES_DB}
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
ENVEOF

    chown "${DEPLOY_USER}:${DEPLOY_USER}" "${ENV_FILE}"
    chmod 600 "${ENV_FILE}"

    echo ".env.production created at ${ENV_FILE}"
    echo "  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}"
    echo ""
    echo "  SAVE THIS PASSWORD SECURELY -- it won't be shown again."
  else
    echo "WARNING: ${APP_DIR} does not exist. Complete Step 4 first."
  fi
fi

# ==============================================================================
# Step 6: Setup Nginx
# ==============================================================================

echo ""
echo "--- Step 6: Configuring Nginx ---"

NGINX_CONF="/etc/nginx/sites-available/mealprep.conf"
NGINX_CONF_SRC="${APP_DIR}/deploy/nginx/mealprep.conf"

if [ -f "${NGINX_CONF_SRC}" ]; then
  # Replace placeholder domain with actual domain
  sed "s/mealprep.example.com/${DOMAIN}/g" "${NGINX_CONF_SRC}" > "${NGINX_CONF}"

  # Enable the site
  ln -sf "${NGINX_CONF}" /etc/nginx/sites-enabled/mealprep.conf

  # Remove default site if it exists
  rm -f /etc/nginx/sites-enabled/default

  # Test and reload
  nginx -t && systemctl reload nginx
  echo "Nginx configured for ${DOMAIN}"
else
  echo "WARNING: Nginx config not found at ${NGINX_CONF_SRC}"
  echo "  Make sure the repo is cloned (Step 4) before running this step."
fi

# ==============================================================================
# Step 7: SSL Certificate via Certbot
# ==============================================================================

echo ""
echo "--- Step 7: Setting up SSL certificate ---"

echo "Requesting SSL certificate for ${DOMAIN}..."
echo ""
echo "NOTE: DNS must be pointing to this server for Certbot to work."
echo "  Verify with: dig +short ${DOMAIN}"
echo ""

certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos --email "admin@${DOMAIN}" || {
  echo ""
  echo "Certbot failed. Common causes:"
  echo "  - DNS not yet propagated (wait a few minutes)"
  echo "  - Port 80 blocked by firewall"
  echo "  - Domain not pointing to this server"
  echo ""
  echo "To retry manually: sudo certbot --nginx -d ${DOMAIN}"
}

# ==============================================================================
# Step 8: Firewall
# ==============================================================================

echo ""
echo "--- Step 8: Configuring firewall ---"

ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "Firewall configured (SSH + Nginx allowed)."

# ==============================================================================
# Step 9: Initial deployment
# ==============================================================================

echo ""
echo "--- Step 9: Building and starting the application ---"

if [ -d "${APP_DIR}" ]; then
  cd "${APP_DIR}"

  # Use .env.production for Docker Compose
  sudo -u "${DEPLOY_USER}" docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

  echo ""
  echo "Application started! Check status with:"
  echo "  cd ${APP_DIR} && docker compose -f docker-compose.prod.yml ps"
else
  echo "WARNING: ${APP_DIR} does not exist. Complete Step 4 first."
fi

# ==============================================================================
# Done!
# ==============================================================================

echo ""
echo "=============================================="
echo " Setup Complete!"
echo "=============================================="
echo ""
echo " Your app should be accessible at: https://${DOMAIN}"
echo ""
echo " Next steps:"
echo "   1. Verify the app loads at https://${DOMAIN}"
echo "   2. Add GitHub Secrets for auto-deploy (Plan 06):"
echo "      - VPS_HOST: $(hostname -I | awk '{print $1}')"
echo "      - VPS_USER: ${DEPLOY_USER}"
echo "      - VPS_SSH_KEY: Contents of your Ed25519 private key"
echo ""
echo " Useful commands:"
echo "   cd ${APP_DIR}"
echo "   docker compose -f docker-compose.prod.yml ps      # Check status"
echo "   docker compose -f docker-compose.prod.yml logs -f  # View logs"
echo "   docker compose -f docker-compose.prod.yml down     # Stop"
echo "   docker compose -f docker-compose.prod.yml up -d    # Start"
echo ""
