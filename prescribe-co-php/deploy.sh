#!/bin/bash

# =============================================================================
# Prescribe & Co — Deploy Script
# Run from inside the prescribeandco/ folder on the server:
#   bash deploy.sh
# =============================================================================

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${BOLD}=====================================${NC}"
echo -e "${BOLD}   Prescribe & Co — Deploy Script   ${NC}"
echo -e "${BOLD}=====================================${NC}"
echo ""

# ── Sanity check ─────────────────────────────────────────────────────────────
if [ ! -f "artisan" ]; then
    echo -e "${RED}Error: Run this script from inside the prescribeandco/ folder.${NC}"
    echo "  cd ~/public_html/prescribeandco && bash deploy.sh"
    exit 1
fi

# ── Collect the four things we need ──────────────────────────────────────────
echo "Answer 4 questions — everything else is automatic."
echo ""

read -p "  Your domain (e.g. https://yourdomain.com): " APP_URL
read -p "  Database name     (from hPanel):            " DB_DATABASE
read -p "  Database username (from hPanel):            " DB_USERNAME
read -s -p "  Database password (from hPanel):            " DB_PASSWORD
echo ""
echo ""

# ── Generate secrets automatically ───────────────────────────────────────────
JWT_ACCESS=$(php -r "echo bin2hex(random_bytes(32));")
JWT_REFRESH=$(php -r "echo bin2hex(random_bytes(32));")

# ── Write .env ───────────────────────────────────────────────────────────────
cat > .env << ENVFILE
APP_NAME="Prescribe & Co"
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=${APP_URL}

LOG_CHANNEL=single
LOG_LEVEL=error

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=${DB_DATABASE}
DB_USERNAME=${DB_USERNAME}
DB_PASSWORD=${DB_PASSWORD}

SESSION_DRIVER=file
SESSION_LIFETIME=120
SESSION_SECURE_COOKIE=false
SESSION_ENCRYPT=false

CACHE_STORE=file

JWT_ACCESS_SECRET=${JWT_ACCESS}
JWT_REFRESH_SECRET=${JWT_REFRESH}
JWT_ACCESS_TTL=900
JWT_REFRESH_TTL=604800

THROTTLE_DEFAULT=20
THROTTLE_AUTH=5
THROTTLE_REFRESH=10

CORS_ALLOWED_ORIGINS=${APP_URL}

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_RETURN_URL=${APP_URL}/payment/return

AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=eu-west-2
AWS_BUCKET=
S3_PRESIGNED_TTL=900
ENVFILE

echo -e "  ${GREEN}✓${NC} .env created"

# ── Install Composer dependencies ─────────────────────────────────────────────
echo -e "  Installing dependencies (this takes ~60s)..."
composer install --no-dev --optimize-autoloader --quiet 2>&1
if [ $? -ne 0 ]; then
    echo -e "  ${RED}✗ Composer failed. Check the error above.${NC}"
    exit 1
fi
echo -e "  ${GREEN}✓${NC} Dependencies installed"

# ── Generate app encryption key ───────────────────────────────────────────────
php artisan key:generate --quiet
echo -e "  ${GREEN}✓${NC} App key generated"

# ── Storage permissions ───────────────────────────────────────────────────────
chmod -R 775 storage bootstrap/cache 2>/dev/null
echo -e "  ${GREEN}✓${NC} Permissions set"

# ── Cache config, routes and views ────────────────────────────────────────────
php artisan config:cache --quiet
php artisan route:cache --quiet
php artisan view:cache --quiet
echo -e "  ${GREEN}✓${NC} Config, routes and views cached"

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}=====================================${NC}"
echo -e "${GREEN}${BOLD}  Deploy complete!${NC}"
echo -e "${BOLD}=====================================${NC}"
echo ""
echo -e "  Site:       ${APP_URL}"
echo -e "  API health: ${APP_URL}/api/v1/health"
echo ""
echo -e "${YELLOW}  If you get a 404, set the document root in hPanel to:${NC}"
echo -e "${YELLOW}  public_html/prescribeandco/public${NC}"
echo ""
echo -e "${YELLOW}  Enable SSL in hPanel → Security → SSL then run:${NC}"
echo -e "${YELLOW}  php artisan config:clear && php artisan config:cache${NC}"
echo ""
