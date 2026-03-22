#!/usr/bin/env bash
# =============================================================================
# HPE Morpheus VME Classic — Deploy Script for Ubuntu 24.04
# Usage:  bash deploy.sh
# =============================================================================
set -euo pipefail

APP_NAME="morpheus-vme-classic"
APP_DIR="/opt/${APP_NAME}"
STATIC_DIR="/var/www/${APP_NAME}/dist"
NGINX_CONF="/etc/nginx/sites-available/${APP_NAME}"
NGINX_ENABLED="/etc/nginx/sites-enabled/${APP_NAME}"
REPO_URL="https://github.com/YOUR_ORG/${APP_NAME}.git"  # ← edit before running

# ── Colors ────────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

print_step() { echo -e "\n${CYAN}▶ $1${NC}"; }
print_ok()   { echo -e "${GREEN}  ✓ $1${NC}"; }
print_warn() { echo -e "${YELLOW}  ⚠ $1${NC}"; }
print_err()  { echo -e "${RED}  ✗ $1${NC}" >&2; }

# ── Check root ────────────────────────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
    print_err "Please run as root: sudo bash deploy.sh"
    exit 1
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║      HPE Morpheus VME Classic — Deployment Script             ║"
echo "║      Ubuntu 24.04 LTS                                         ║"
echo "╚═══════════════════════════════════════════════════════════════╝"

# ── Step 1: Collect VME URL ───────────────────────────────────────────────────
print_step "VME Manager Configuration"
read -rp "  Enter your VME Manager URL (e.g. https://morpheus.example.com): " VME_URL

# Validate URL format
if [[ ! "$VME_URL" =~ ^https?:// ]]; then
    print_err "URL must start with http:// or https://"
    exit 1
fi

# Strip trailing slash
VME_URL="${VME_URL%/}"
print_ok "VME URL: $VME_URL"

# ── Step 2: System dependencies ───────────────────────────────────────────────
print_step "Installing system dependencies"
apt-get update -qq

# Install Nginx
if ! command -v nginx &>/dev/null; then
    apt-get install -y -qq nginx
    print_ok "Nginx installed"
else
    print_ok "Nginx already installed"
fi

# Install Node.js 20 LTS
if ! command -v node &>/dev/null || [[ $(node -v | cut -d. -f1 | tr -d v) -lt 18 ]]; then
    print_warn "Installing Node.js 20 LTS via NodeSource…"
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
    apt-get install -y -qq nodejs
    print_ok "Node.js $(node -v) installed"
else
    print_ok "Node.js $(node -v) already installed"
fi

# Install git
if ! command -v git &>/dev/null; then
    apt-get install -y -qq git
    print_ok "git installed"
fi

# Install ufw if not present
if ! command -v ufw &>/dev/null; then
    apt-get install -y -qq ufw
fi

# ── Step 3: Clone / Update repo ───────────────────────────────────────────────
print_step "Fetching application source"
if [[ -d "$APP_DIR/.git" ]]; then
    print_warn "Repo exists — pulling latest…"
    git -C "$APP_DIR" pull --ff-only
else
    git clone "$REPO_URL" "$APP_DIR"
fi
print_ok "Source at $APP_DIR"

# ── Step 4: Install npm dependencies ─────────────────────────────────────────
print_step "Installing npm dependencies"
cd "$APP_DIR"
npm ci --prefer-offline --silent
print_ok "Dependencies installed"

# ── Step 5: Build ─────────────────────────────────────────────────────────────
print_step "Building production bundle"
npm run build
print_ok "Build complete"

# ── Step 6: Deploy static files ──────────────────────────────────────────────
print_step "Deploying static files"
mkdir -p "$STATIC_DIR"
rsync -a --delete "$APP_DIR/dist/" "$STATIC_DIR/"
chown -R www-data:www-data "/var/www/${APP_NAME}"
print_ok "Static files deployed to $STATIC_DIR"

# ── Step 7: Configure Nginx ───────────────────────────────────────────────────
print_step "Configuring Nginx"
cp "$APP_DIR/nginx/morpheus-vme.conf" "$NGINX_CONF"
# Substitute the real VME URL
sed -i "s|VME_MANAGER_URL_PLACEHOLDER|${VME_URL}|g" "$NGINX_CONF"

# Enable site, remove default if present
ln -sf "$NGINX_CONF" "$NGINX_ENABLED"
rm -f /etc/nginx/sites-enabled/default

# Test config
nginx -t
print_ok "Nginx config valid"

# ── Step 8: Firewall ──────────────────────────────────────────────────────────
print_step "Configuring firewall"
ufw --force enable >/dev/null
ufw allow 'Nginx HTTP' >/dev/null
ufw allow OpenSSH >/dev/null
print_ok "ufw: HTTP + SSH allowed"

# ── Step 9: Reload services ───────────────────────────────────────────────────
print_step "Starting / reloading services"
systemctl enable nginx
systemctl reload nginx || systemctl start nginx
print_ok "Nginx running"

# ── Done ──────────────────────────────────────────────────────────────────────
SERVER_IP=$(hostname -I | awk '{print $1}')

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗"
echo -e "║  ✅  HPE Morpheus VME Classic deployed successfully!          ║"
echo -e "╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${CYAN}Dashboard:${NC}   http://${SERVER_IP}/"
echo -e "  ${CYAN}VME Proxy:${NC}   http://${SERVER_IP}/api/ → ${VME_URL}/api/"
echo -e "  ${CYAN}Static dir:${NC}  ${STATIC_DIR}"
echo -e "  ${CYAN}Nginx conf:${NC}  ${NGINX_CONF}"
echo ""
echo "  Open a browser and navigate to http://${SERVER_IP}/"
echo "  Sign in with your Morpheus username and password."
echo ""
