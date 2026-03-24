#!/usr/bin/env bash
# =============================================================================
# HPE Morpheus VME Classic — Deploy Script for Ubuntu 24.04
# Usage:  sudo bash deploy.sh
# =============================================================================
set -euo pipefail

APP_NAME="morpheus-vme-classic"
APP_DIR="/opt/${APP_NAME}"
STATIC_DIR="/var/www/${APP_NAME}/dist"
SSL_DIR="/etc/ssl/morpheus-vme"
NGINX_CONF="/etc/nginx/sites-available/${APP_NAME}"
NGINX_ENABLED="/etc/nginx/sites-enabled/${APP_NAME}"
REPO_URL="https://github.com/jstiops/morpheus-vme-classic.git"

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

if [[ ! "$VME_URL" =~ ^https?:// ]]; then
    print_err "URL must start with http:// or https://"
    exit 1
fi
VME_URL="${VME_URL%/}"
print_ok "VME URL: $VME_URL"

# ── Step 2: System dependencies ───────────────────────────────────────────────
print_step "Installing system dependencies"
apt-get update -qq

if ! command -v nginx &>/dev/null; then
    apt-get install -y -qq nginx
    print_ok "Nginx installed"
else
    print_ok "Nginx already installed"
fi

if ! command -v openssl &>/dev/null; then
    apt-get install -y -qq openssl
    print_ok "openssl installed"
else
    print_ok "openssl already installed"
fi

if ! command -v node &>/dev/null || [[ $(node -v | cut -d. -f1 | tr -d v) -lt 18 ]]; then
    print_warn "Installing Node.js 20 LTS via NodeSource…"
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
    apt-get install -y -qq nodejs
    print_ok "Node.js $(node -v) installed"
else
    print_ok "Node.js $(node -v) already installed"
fi

if ! command -v git &>/dev/null; then
    apt-get install -y -qq git
    print_ok "git installed"
fi

if ! command -v ufw &>/dev/null; then
    apt-get install -y -qq ufw
fi

# ── Step 3: Generate self-signed TLS certificate ──────────────────────────────
print_step "Generating self-signed TLS certificate (10-year validity)"
mkdir -p "$SSL_DIR"
SERVER_IP=$(hostname -I | awk '{print $1}')
SERVER_HOST=$(hostname -f 2>/dev/null || echo "localhost")

openssl req -x509 -nodes -days 3650 \
    -newkey rsa:2048 \
    -keyout "${SSL_DIR}/key.pem" \
    -out    "${SSL_DIR}/cert.pem" \
    -subj   "/C=US/O=HPE Morpheus VME Classic/CN=${SERVER_HOST}" \
    -addext "subjectAltName=IP:${SERVER_IP},DNS:${SERVER_HOST},DNS:localhost" \
    2>/dev/null

chmod 600 "${SSL_DIR}/key.pem"
chmod 644 "${SSL_DIR}/cert.pem"
print_ok "Certificate: ${SSL_DIR}/cert.pem  (CN=${SERVER_HOST}, SAN=IP:${SERVER_IP})"
print_ok "Private key: ${SSL_DIR}/key.pem"

# ── Step 4: Clone / Update repo ───────────────────────────────────────────────
print_step "Fetching application source"
if [[ -d "$APP_DIR/.git" ]]; then
    print_warn "Repo exists — pulling latest…"
    git -C "$APP_DIR" pull --ff-only
else
    git clone "$REPO_URL" "$APP_DIR"
fi
print_ok "Source at $APP_DIR"

# ── Step 5: Install npm dependencies ─────────────────────────────────────────
print_step "Installing npm dependencies (this may take a few minutes)"
cd "$APP_DIR"
npm ci --no-audit --no-fund
print_ok "Dependencies installed"

# ── Step 6: Build ─────────────────────────────────────────────────────────────
print_step "Building production bundle (this may take a minute)"
npm run build 2>&1
print_ok "Build complete"

# ── Step 7: Deploy static files ──────────────────────────────────────────────
print_step "Deploying static files"
mkdir -p "$STATIC_DIR"
rsync -a --delete "$APP_DIR/dist/" "$STATIC_DIR/"
chown -R www-data:www-data "/var/www/${APP_NAME}"
print_ok "Static files deployed to $STATIC_DIR"

# ── Step 8: Configure Nginx ───────────────────────────────────────────────────
print_step "Configuring Nginx"
cp "$APP_DIR/nginx/morpheus-vme.conf" "$NGINX_CONF"
sed -i "s|VME_MANAGER_URL_PLACEHOLDER|${VME_URL}|g" "$NGINX_CONF"

ln -sf "$NGINX_CONF" "$NGINX_ENABLED"
rm -f /etc/nginx/sites-enabled/default

nginx -t
print_ok "Nginx config valid"

# ── Step 9: Firewall ──────────────────────────────────────────────────────────
print_step "Configuring firewall (HTTPS + SSH only)"
ufw --force enable >/dev/null
ufw allow 'Nginx HTTPS' >/dev/null
ufw allow OpenSSH >/dev/null
ufw delete allow 'Nginx HTTP' >/dev/null 2>&1 || true
ufw delete allow 80/tcp    >/dev/null 2>&1 || true
print_ok "ufw: HTTPS (443) + SSH allowed — port 80 blocked"

# ── Step 10: Reload services ──────────────────────────────────────────────────
print_step "Starting / reloading services"
systemctl enable nginx
systemctl reload nginx || systemctl start nginx
print_ok "Nginx running"

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗"
echo -e "║  ✅  HPE Morpheus VME Classic deployed successfully!          ║"
echo -e "╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${CYAN}Dashboard:${NC}   https://${SERVER_IP}/"
echo -e "  ${CYAN}VME Proxy:${NC}   https://${SERVER_IP}/api/ → ${VME_URL}/api/"
echo -e "  ${CYAN}TLS cert:${NC}    ${SSL_DIR}/cert.pem"
echo ""
echo "  ⚠  The certificate is self-signed. Browsers will show a security"
echo "     warning — click 'Advanced → Proceed' to continue."
echo "     To trust it system-wide, import ${SSL_DIR}/cert.pem into your"
echo "     browser or OS certificate store."
echo ""
echo "  Open a browser and navigate to https://${SERVER_IP}/"
echo "  Sign in with your Morpheus username and password."
echo ""
