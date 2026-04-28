# Quick Deploy — No SSH, No Document Root Change

---

## What goes where

```
public_html/                        ← Hostinger web root (DO NOT change this)
│
├── index.php                       ← from hostinger-root/
├── .htaccess                       ← from hostinger-root/
├── setup.php                       ← from hostinger-root/  (deleted after install)
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
   (index.php, .htaccess, setup.php and the css/ folder go at the root level)

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

## Step 3 — Run the browser installer

Visit:
```
https://your-temp-domain.hostingersite.com/setup.php
```

Fill in your domain and the database details from Step 2, click **Install now**.

The installer will install dependencies, write your config, generate all secrets, set permissions, and delete itself.

---

## Step 4 — Check it works

| Page | URL |
|---|---|
| Homepage | `https://your-temp-domain.hostingersite.com` |
| Treatments | `https://your-temp-domain.hostingersite.com/treatments` |
| Register | `https://your-temp-domain.hostingersite.com/register` |
| API health | `https://your-temp-domain.hostingersite.com/api/v1/health` |

---

## Something went wrong?

| Problem | Fix |
|---|---|
| 403 on homepage | `.htaccess` or `index.php` not in `public_html/` root — check Step 1 |
| 404 on setup.php | `setup.php` not in `public_html/` root |
| "Tables are missing" | Run the SQL in phpMyAdmin (Step 2) first |
| "Database connection failed" | Wrong credentials, or user not assigned to the database |
| Blank page after setup | Open `prescribeandco/storage/logs/laravel.log` in File Manager |

---

## Updating after changes

1. Upload changed files via File Manager (overwrite)
2. Delete `prescribeandco/bootstrap/cache/config.php` in File Manager if you changed config
3. Refresh the site
