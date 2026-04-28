# Quick Deploy — No SSH, No Document Root Change

---

## What goes where

```
public_html/                        ← Hostinger web root (DO NOT change this)
│
├── index.php                       ← from hostinger-root/
├── .htaccess                       ← from hostinger-root/htaccess.txt  (rename it)
├── configure.php                   ← from hostinger-root/  (delete after setup)
├── setup.php                       ← from hostinger-root/  (deleted automatically)
├── check.php                       ← from hostinger-root/  (delete after setup)
├── css/
│   └── app.css                     ← from hostinger-root/css/
│
└── prescribeandco/                 ← upload prescribe-co-php/ contents here
    ├── app/
    ├── bootstrap/
    ├── config/
    ├── database/
    ├── resources/
    ├── routes/
    ├── storage/
    ├── artisan
    ├── composer.json
    └── composer.lock
```

---

## Step 1 — Upload files

**In hPanel → Files → File Manager → open `public_html/`:**

1. Create a folder called `prescribeandco` inside `public_html/`
2. Upload the contents of `prescribe-co-php/` into `public_html/prescribeandco/`
3. Upload the contents of `prescribe-co-php/hostinger-root/` directly into `public_html/`
   - `index.php`, `configure.php`, `setup.php`, `check.php`, and the `css/` folder go at the root level
   - Rename `htaccess.txt` to `.htaccess` (File Manager → right-click → Rename)

**Tip:** Zip each group separately and extract in the right place.

---

## Step 2 — Set up the database

**hPanel → Databases → MySQL Databases:**
- Create a database — e.g. `u123456789_prescribe`
- Create a user — e.g. `u123456789_appuser` with a strong password
- Add the user to the database → **All Privileges**

**hPanel → Databases → phpMyAdmin:**
- Click your database → **SQL** tab
- Open `prescribeandco/database/prescribeandco.sql`, paste everything → **Go**

---

## Step 3 — Configure your site

Visit:
```
https://your-temp-domain.hostingersite.com/configure.php
```

Fill in:
- **Domain** — your full site URL (e.g. `https://yourdomain.hostingersite.com`)
- **DB Host** — usually `127.0.0.1`
- **Database name / Username / Password** — from Step 2

Click **Save configuration**. This writes your `.env` file and generates your `APP_KEY`.

> **To update DB credentials later** — just visit `configure.php` again. It reads the existing
> values and lets you change only what you need.

---

## Step 4 — Install dependencies

Visit:
```
https://your-temp-domain.hostingersite.com/setup.php
```

Click **Install**. This installs Composer packages, sets folder permissions, and deletes itself.

If Composer can't run automatically, the page will show you an exact command to paste into
hPanel → Advanced → SSH Terminal.

---

## Step 5 — Check it works

| Page | URL |
|---|---|
| Homepage | `https://your-temp-domain.hostingersite.com` |
| Treatments | `https://your-temp-domain.hostingersite.com/treatments` |
| Register | `https://your-temp-domain.hostingersite.com/register` |
| API health | `https://your-temp-domain.hostingersite.com/api/v1/health` |

Or visit `/check.php` for a full diagnostic report.

---

## After setup — clean up

Delete these files from `public_html/` via File Manager:
- `configure.php`
- `check.php`
- `setup.php` (deletes itself, but confirm it's gone)

---

## Something went wrong?

| Problem | Fix |
|---|---|
| 403 on homepage | `.htaccess` or `index.php` not in `public_html/` root — check Step 1 |
| White screen | Run `/check.php` to see what's missing |
| APP_KEY missing | Run `/configure.php` — tick "Generate new keys" and save |
| vendor/ missing | Run `/setup.php` after configure.php |
| "Tables are missing" | Run the SQL in phpMyAdmin (Step 2) first |
| "Database connection failed" | Wrong credentials, or user not assigned to DB |
| Blank page after setup | Open `prescribeandco/storage/logs/laravel.log` in File Manager |

---

## Updating DB credentials later

1. Visit `configure.php`
2. Update the fields — leave Password blank to keep the existing one
3. Save
4. Delete `prescribeandco/bootstrap/cache/config.php` in File Manager (forces Laravel to re-read .env)
5. Refresh the site
