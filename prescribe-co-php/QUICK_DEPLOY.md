# Quick Deploy — 5 Steps

---

## Step 1 — Upload files to Hostinger

1. Download this repo as a ZIP from GitHub (green **Code** button → **Download ZIP**)
2. Unzip it on your computer — go into the `prescribe-co-php` folder
3. Zip the contents of `prescribe-co-php` (not the folder itself, the files inside)
4. In **hPanel → Files → File Manager** → open `public_html/`
5. Create a folder called `prescribeandco`
6. Upload your zip into it → right-click → **Extract**

---

## Step 2 — Run the SQL

1. **hPanel → Databases → MySQL Databases** → create a database, a user, and assign the user to the database with All Privileges
2. **hPanel → Databases → phpMyAdmin** → click your database → **SQL** tab
3. Open `database/prescribeandco.sql`, paste the whole thing → **Go**

---

## Step 3 — Point your domain to the right folder

**hPanel → Domains → Manage → ⋮ → Edit**

Change **Document Root** to:
```
public_html/prescribeandco/public
```

---

## Step 4 — Run the deploy script via SSH

```bash
# Connect (get hostname/port from hPanel → Advanced → SSH Access)
ssh u123456789@your.server.hostname -p 65002

# Go into your app folder
cd ~/public_html/prescribeandco

# Run the script — it will ask you 4 questions then do everything
bash deploy.sh
```

The script asks for:
- Your domain (e.g. `https://yourdomain.com`)
- Database name, username, password (from Step 2)

Everything else (JWT secrets, app key, permissions, caching) is done automatically.

---

## Step 5 — Check it works

| Page | URL |
|---|---|
| Homepage | `https://yourdomain.com` |
| Treatments | `https://yourdomain.com/treatments` |
| Register | `https://yourdomain.com/register` |
| API check | `https://yourdomain.com/api/v1/health` |

---

## Something went wrong?

```bash
# See the exact error
tail -50 ~/public_html/prescribeandco/storage/logs/laravel.log
```

| Problem | Fix |
|---|---|
| 404 everywhere | Document root not set correctly in Step 3 |
| 500 error | Check the log file above |
| Can't connect to DB | Wrong DB credentials — edit `.env` then run `php artisan config:cache` |
| CSS not loading | `APP_URL` in `.env` doesn't match your actual domain |

---

## Redeploying after changes

Upload the changed files, then SSH in and run:

```bash
cd ~/public_html/prescribeandco
php artisan optimize:clear
php artisan config:cache && php artisan route:cache && php artisan view:cache
```
