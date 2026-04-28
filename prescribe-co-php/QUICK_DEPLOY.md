# Quick Deploy — 4 Steps, No SSH

---

## Step 1 — Upload files

1. On this GitHub page click the green **Code** button → **Download ZIP**
2. Unzip it — go inside the `prescribe-co-php` folder
3. Select everything inside `prescribe-co-php`, zip those files
4. In **hPanel → Files → File Manager** → open `public_html/`
5. Create a folder called `prescribeandco`
6. Upload your zip into that folder → right-click it → **Extract**

---

## Step 2 — Set document root

**hPanel → Domains → Manage → click ⋮ next to your domain → Edit**

Change **Document Root** to:
```
public_html/prescribeandco/public
```
Click Save.

---

## Step 3 — Run the SQL

**hPanel → Databases → MySQL Databases**
- Create a database — e.g. `u123456789_prescribe`
- Create a user — e.g. `u123456789_appuser` with a strong password
- Add the user to the database → **All Privileges**

**hPanel → Databases → phpMyAdmin**
- Click your database name in the left panel
- Click the **SQL** tab
- Open `database/prescribeandco.sql`, paste everything → **Go**

---

## Step 4 — Run the browser installer

Visit:
```
https://yourdomain.com/setup.php
```

Fill in your domain and the database details from Step 3, then click **Install now**.

The installer will:
- Install all PHP dependencies automatically
- Generate your app key and JWT secrets
- Write your config file
- Set folder permissions
- Delete itself when done

**That's it — your site is live.**

---

## Check it works

| Page | URL |
|---|---|
| Homepage | `https://yourdomain.com` |
| Treatments | `https://yourdomain.com/treatments` |
| Register | `https://yourdomain.com/register` |
| API health | `https://yourdomain.com/api/v1/health` |

---

## Something went wrong?

| Problem | Fix |
|---|---|
| setup.php returns 404 | Document root not set correctly — check Step 2 |
| "Tables are missing" | Run the SQL file in phpMyAdmin (Step 3) first |
| "Database connection failed" | Wrong credentials, or user not assigned to database |
| "Composer not found" | Contact Hostinger support — or use SSH: `cd ~/public_html/prescribeandco && composer install --no-dev` |
| Blank page after setup | Open `storage/logs/laravel.log` in File Manager to see the error |

---

## Updating the site after changes

1. Upload the changed files via File Manager (overwrite existing ones)
2. If config changed: delete `bootstrap/cache/config.php` in File Manager
3. Refresh — done
