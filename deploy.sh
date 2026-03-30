#!/usr/bin/env bash
# =============================================================================
# HPE Morpheus VME Classic — Deploy Script for Ubuntu 24.04
# Usage:  sudo bash deploy.sh           (fresh install)
#         sudo bash deploy.sh --update  (pull + rebuild only, keeps TLS cert)
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

# ── Parse flags ───────────────────────────────────────────────────────────────
UPDATE_MODE=false
for arg in "$@"; do
    case "$arg" in
        --update) UPDATE_MODE=true ;;
        --help|-h)
            echo "Usage: sudo bash deploy.sh [--update]"
            echo ""
            echo "  (no flag)   Full install: dependencies, TLS cert, build, nginx, firewall"
            echo "  --update    Pull latest code and rebuild only — skips cert/nginx/firewall"
            exit 0
            ;;
    esac
done

# ── Check root ────────────────────────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
    print_err "Please run as root: sudo bash deploy.sh"
    exit 1
fi

SERVER_IP=$(hostname -I | awk '{print $1}')
SERVER_HOST=$(hostname -f 2>/dev/null || echo "localhost")

# ══════════════════════════════════════════════════════════════════════════════
# UPDATE MODE — pull + rebuild + redeploy only, TLS cert and nginx untouched
# ══════════════════════════════════════════════════════════════════════════════
if [[ "$UPDATE_MODE" == true ]]; then
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║      HPE Morpheus VME Classic — Update                        ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"

    if [[ ! -d "$APP_DIR/.git" ]]; then
        print_err "Application not found at $APP_DIR. Run without --update for a fresh install."
        exit 1
    fi

    # Read existing VME URL from config.json so the user isn't prompted again
    CONFIG_FILE="/var/www/${APP_NAME}/config.json"
    VME_URL=""
    if [[ -f "$CONFIG_FILE" ]]; then
        VME_URL=$(python3 -c "import json,sys; print(json.load(open('$CONFIG_FILE'))['vmeManagerUrl'])" 2>/dev/null || true)
    fi
    if [[ -z "${VME_URL}" ]]; then
        print_warn "Could not read existing VME URL from $CONFIG_FILE"
        read -rp "  Enter your VME Manager URL (e.g. https://morpheus.example.com): " VME_URL
        VME_URL="${VME_URL%/}"
    fi
    print_ok "VME URL: $VME_URL"

    print_step "Pulling latest source"
    git -C "$APP_DIR" pull --ff-only
    print_ok "Source updated"

    print_step "Installing npm dependencies"
    cd "$APP_DIR"
    npm install --no-audit --no-fund
    print_ok "Dependencies up to date"

    print_step "Building production bundle"
    npm run build 2>&1
    print_ok "Build complete"

    print_step "Deploying static files"
    mkdir -p "$STATIC_DIR"
    rsync -a --delete "$APP_DIR/dist/" "$STATIC_DIR/"
    # Rewrite config.json (lives outside dist/ so rsync --delete never removes it)
    cat > "/var/www/${APP_NAME}/config.json" <<EOF
{"vmeManagerUrl":"${VME_URL}"}
EOF
    chown -R www-data:www-data "/var/www/${APP_NAME}"
    print_ok "Static files deployed to $STATIC_DIR"

    print_step "Reloading Nginx"
    systemctl reload nginx
    print_ok "Nginx reloaded"

    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗"
    echo -e "║  ✅  HPE Morpheus VME Classic updated successfully!           ║"
    echo -e "╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  ${CYAN}Dashboard:${NC}   https://${SERVER_IP}/"
    echo ""
    exit 0
fi

# ══════════════════════════════════════════════════════════════════════════════
# FULL INSTALL MODE
# ══════════════════════════════════════════════════════════════════════════════
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
else
    print_ok "git already installed"
fi

if ! command -v ufw &>/dev/null; then
    apt-get install -y -qq ufw
fi

# ── Step 3: Generate self-signed TLS certificate ──────────────────────────────
print_step "Generating self-signed TLS certificate (10-year validity)"
mkdir -p "$SSL_DIR"

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
npm install --no-audit --no-fund
print_ok "Dependencies installed"

# ── Step 6: Build ─────────────────────────────────────────────────────────────
print_step "Building production bundle (this may take a minute)"
npm run build 2>&1
print_ok "Build complete"

# ── Step 7: Deploy static files ──────────────────────────────────────────────
print_step "Deploying static files"
mkdir -p "$STATIC_DIR"
rsync -a --delete "$APP_DIR/dist/" "$STATIC_DIR/"
mkdir -p "$(dirname "$STATIC_DIR")"

# Write runtime config one level above dist/ so rsync --delete never removes it.
# The app fetches /config.json on startup; nginx serves it via root directive.
cat > "/var/www/${APP_NAME}/config.json" <<EOF
{"vmeManagerUrl":"${VME_URL}"}
EOF
print_ok "Runtime config written to /var/www/${APP_NAME}/config.json"

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
echo "  To update the application in future, run:"
echo "    sudo bash /opt/${APP_NAME}/deploy.sh --update"
echo ""
echo "  Open a browser and navigate to https://${SERVER_IP}/"
echo "  Sign in with your Morpheus username and password."
echo ""
