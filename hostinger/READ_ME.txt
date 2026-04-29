=========================================================
 Prescribe & Co — Hostinger Upload Guide
=========================================================

WHAT TO DO
----------
Upload the CONTENTS of this folder directly into public_html/
on Hostinger.  After uploading, public_html/ should look like:

  public_html/
  ├── .htaccess
  ├── index.php
  ├── configure.php
  ├── setup.php
  ├── check.php
  ├── css/
  │   └── app.css
  └── prescribeandco/
      ├── vendor.zip
      ├── app/
      ├── bootstrap/
      ├── config/
      └── ... (etc)


STEP 1 — Upload
---------------
In hPanel → File Manager → open public_html/
Upload everything from this folder (including hidden files like .htaccess)

Tip: zip this whole folder, upload the zip to public_html/,
and use File Manager → Extract to unzip it there.


STEP 2 — Set up the database
-----------------------------
hPanel → Databases → MySQL Databases:
  • Create database  e.g.  u123456789_prescribe
  • Create user      e.g.  u123456789_appuser
  • Add user to database → All Privileges

hPanel → Databases → phpMyAdmin:
  • Open your database → SQL tab
  • Paste the contents of prescribeandco/database/prescribeandco.sql → Go


STEP 3 — Configure
-------------------
Visit:  https://yourdomain.com/configure.php

Fill in:
  • Domain       — your full URL (e.g. https://yourdomain.hostingersite.com)
  • DB Host      — usually 127.0.0.1
  • DB Name / Username / Password  — from Step 2

Click Save.  This writes your .env file and generates your APP_KEY.


STEP 4 — Install
-----------------
Visit:  https://yourdomain.com/setup.php

Click Install.  This extracts vendor.zip and sets folder permissions.
The page deletes itself when done.


STEP 5 — Check
---------------
Visit:  https://yourdomain.com/check.php

Everything should show green ticks.
Delete configure.php and check.php from File Manager once working.


UPDATING DB CREDENTIALS LATER
-------------------------------
1. Re-upload configure.php to public_html/
2. Visit /configure.php — update only what changed
3. Save
4. Delete prescribeandco/bootstrap/cache/config.php in File Manager
5. Delete configure.php again


SOMETHING WRONG?
-----------------
White screen     →  visit /check.php
403 error        →  .htaccess not uploaded, or wrong location
APP_KEY missing  →  visit /configure.php, tick "Generate new keys", save
vendor/ missing  →  visit /setup.php and click Install
=========================================================
