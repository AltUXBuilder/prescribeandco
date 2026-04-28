# Prescribe & Co — Hostinger Deployment Guide

Fresh install guide for Hostinger shared hosting with MySQL.

---

## Requirements

| Requirement | Version |
|---|---|
| PHP | 8.2 or 8.3 |
| MySQL | 8.0+ (or MariaDB 10.5+) |
| Composer | 2.x (pre-installed on Hostinger) |
| SSH access | Required (Business plan or above) |

---

## Step 1 — Set PHP version

In **hPanel → Advanced → PHP Configuration**:

- Select **PHP 8.2** or **8.3**
- Confirm these extensions are enabled (they are on Hostinger by default):
  `pdo_mysql`, `mbstring`, `openssl`, `json`, `tokenizer`, `xml`, `ctype`, `fileinfo`, `curl`
- Click **Save**

---

## Step 2 — Create the MySQL database

In **hPanel → Databases → MySQL Databases**:

1. Create a new database — e.g. `u123456789_prescribe`
2. Create a database user — e.g. `u123456789_appuser` with a strong password
3. Add that user to the database with **All Privileges**

Note down your credentials — you will need them for `.env` in Step 5.

---

## Step 3 — Run the SQL schema

In **hPanel → Databases → phpMyAdmin**:

1. Click your database name in the left panel
2. Click the **SQL** tab
3. Open `database/prescribeandco.sql` from this repo
4. Paste the entire contents into the SQL box
5. Click **Go**

You will see green success messages for all 13 tables plus seed data.

**Running more queries later:**
Paste new statements into the SQL tab and run only those lines.
Every table uses `CREATE TABLE IF NOT EXISTS` and every insert uses
`INSERT IGNORE` — re-running the full file is always safe.

---

## Step 4 — Upload files

### What to upload

Upload the entire contents of the `prescribe-co-php/` folder:

```
app/
bootstrap/
config/
database/
public/
resources/
routes/
storage/
artisan
composer.json
composer.lock
.env.example
```

### What NOT to upload

```
vendor/          ← installed on the server via Composer (Step 6)
.env             ← created on the server manually (Step 5)
```

### How to upload — File Manager

1. **hPanel → Files → File Manager**
2. Navigate into `public_html/`
3. Create a folder called `prescribeandco`
4. Compress the files above into a `.zip` locally
5. Upload the zip into `public_html/prescribeandco/`
6. Right-click the zip → **Extract**

Your structure should look like this:

```
public_html/
└── prescribeandco/
    ├── app/
    ├── bootstrap/
    ├── config/
    ├── public/          ← this becomes the web root
    ├── resources/
    ├── routes/
    ├── storage/
    ├── artisan
    └── composer.json
```

### How to upload — FTP (FileZilla)

Get credentials from **hPanel → Files → FTP Accounts**.
Upload to `/public_html/prescribeandco/`.

---

## Step 5 — Point your domain to `public/`

In **hPanel → Domains → Manage** → click the **⋮** menu → **Edit**:

Change **Document Root** from:
```
public_html
```
to:
```
public_html/prescribeandco/public
```

Click **Save**.

This means your domain serves only the `public/` folder.
Your app code, `.env`, and `storage/` are never directly accessible from the web.

> **Subdomain:** If deploying to e.g. `app.yourdomain.com`, create it under
> **hPanel → Domains → Subdomains** and set its document root to
> `public_html/prescribeandco/public` from the start.

---

## Step 6 — Connect via SSH

Get credentials from **hPanel → Advanced → SSH Access**.

```bash
ssh u123456789@your.hostinger.server -p 65002
```

---

## Step 7 — Install Composer dependencies

```bash
cd ~/public_html/prescribeandco

composer install --no-dev --optimize-autoloader
```

This installs the `vendor/` folder. Takes around 60 seconds.

---

## Step 8 — Create and configure `.env`

```bash
cp .env.example .env
nano .env
```

Fill in every value:

```dotenv
APP_NAME="Prescribe & Co"
APP_ENV=production
APP_KEY=                          # filled by Step 9
APP_DEBUG=false
APP_URL=https://yourdomain.com    # your actual domain, no trailing slash

LOG_CHANNEL=single
LOG_LEVEL=error

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=u123456789_prescribe
DB_USERNAME=u123456789_appuser
DB_PASSWORD=your_strong_password

SESSION_DRIVER=file
SESSION_LIFETIME=120
SESSION_SECURE_COOKIE=true
SESSION_ENCRYPT=false

CACHE_STORE=file

JWT_ACCESS_SECRET=                # generate below
JWT_REFRESH_SECRET=               # generate below
JWT_ACCESS_TTL=900
JWT_REFRESH_TTL=604800

CORS_ALLOWED_ORIGINS=https://yourdomain.com

# Stripe — leave blank until you are ready to go live
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_RETURN_URL=https://yourdomain.com/payment/return

# AWS S3 — leave blank if not using document upload yet
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=eu-west-2
AWS_BUCKET=
```

**Generate JWT secrets** (run this twice, use one value for each):

```bash
php -r "echo bin2hex(random_bytes(32)) . PHP_EOL;"
```

Save and close: `Ctrl+X` → `Y` → `Enter`

---

## Step 9 — Generate the app key

```bash
php artisan key:generate
```

This writes `APP_KEY=base64:...` into your `.env` automatically.

---

## Step 10 — Set storage permissions

```bash
chmod -R 775 storage bootstrap/cache
```

---

## Step 11 — Cache config and routes for production

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

> Every time you edit `.env` or change a route/config file you must re-run
> these commands. To clear caches: `php artisan optimize:clear`

---

## Step 12 — Enable SSL (HTTPS)

In **hPanel → Security → SSL**:

1. Click **Install** next to your domain (free Let's Encrypt)
2. Enable **Force HTTPS** redirect

Once SSL is active, confirm `SESSION_SECURE_COOKIE=true` is set in `.env`
and re-run `php artisan config:cache`.

---

## Verification checklist

Visit your domain and confirm each of these works:

| Page | URL |
|---|---|
| Homepage | `https://yourdomain.com` |
| Treatments list | `https://yourdomain.com/treatments` |
| Register | `https://yourdomain.com/register` |
| Login | `https://yourdomain.com/login` |
| Dashboard (after login) | `https://yourdomain.com/dashboard` |
| API health check | `https://yourdomain.com/api/v1/health` |

If any page returns a 500 error:

```bash
tail -50 ~/public_html/prescribeandco/storage/logs/laravel.log
```

---

## Updating the site after changes

When you make code changes and want to redeploy:

1. Upload the changed files via File Manager or FTP (overwrite existing)
2. SSH in and run:

```bash
cd ~/public_html/prescribeandco

# Only if composer.json changed
composer install --no-dev --optimize-autoloader

# Always run after any update
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

---

## Common problems

| Problem | Fix |
|---|---|
| All routes return 404 | `public/.htaccess` is missing or mod_rewrite is off — check hPanel → Advanced → PHP Configuration |
| 500 on every page | Check `storage/logs/laravel.log`; usually a wrong `.env` value or missing `APP_KEY` |
| "No application encryption key" | Run `php artisan key:generate` |
| CSS / fonts not loading | `APP_URL` in `.env` must match your domain exactly including `https://` |
| Login doesn't persist | Run `chmod -R 775 storage` — sessions can't be written |
| Database connection refused | Use `DB_HOST=127.0.0.1`, not `localhost` |
| Redirect loop on login | Set `SESSION_SECURE_COOKIE=false` temporarily if not yet on HTTPS |
| Changes not showing | Run `php artisan optimize:clear` then re-cache |

---

## File structure reference

```
prescribeandco/                  ← project root (above web root)
├── app/
│   ├── Enums/                   ← PHP enums (Role, PrescriptionStatus, etc.)
│   ├── Helpers/helpers.php      ← statusBadge() global helper
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Api/             ← JSON API controllers
│   │   │   └── Web/             ← Blade web controllers
│   │   └── Middleware/          ← JWT auth, session auth, security headers
│   ├── Models/                  ← Eloquent models
│   ├── Providers/               ← AppServiceProvider (service bindings)
│   └── Services/                ← Business logic (Auth, JWT, Eligibility, etc.)
├── bootstrap/
│   ├── app.php                  ← registers web + API routes, middleware aliases
│   ├── cache/                   ← compiled config/route cache (auto-generated)
│   └── providers.php
├── config/
│   ├── app.php                  ← timezone, locale, encryption
│   ├── auth.php                 ← JWT secrets and TTLs
│   ├── cache.php
│   ├── cors.php                 ← CORS restricted to api/* routes
│   ├── database.php
│   ├── filesystem.php
│   ├── logging.php
│   ├── services.php             ← Stripe and AWS credentials
│   └── session.php
├── database/
│   └── prescribeandco.sql       ← run this in phpMyAdmin for fresh install
├── public/                      ← WEB ROOT — point domain here
│   ├── .htaccess                ← Apache rewrite rules
│   ├── index.php                ← Laravel front controller
│   └── css/app.css              ← compiled brand stylesheet
├── resources/
│   └── views/                   ← Blade templates
│       ├── layouts/app.blade.php
│       ├── home.blade.php
│       ├── auth/
│       ├── products/
│       ├── conditions/
│       ├── consultation/
│       ├── dashboard/
│       └── components/
├── routes/
│   ├── api.php                  ← /api/v1/* routes (JWT protected)
│   └── web.php                  ← web routes (session protected)
├── storage/                     ← writable at runtime, never web-accessible
│   ├── app/
│   ├── framework/
│   │   ├── cache/
│   │   ├── sessions/
│   │   └── views/
│   └── logs/
├── artisan                      ← CLI entry point
├── composer.json
├── composer.lock
└── .env.example                 ← copy to .env and fill in your values
```
