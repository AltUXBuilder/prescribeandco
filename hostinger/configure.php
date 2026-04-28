<?php
/**
 * Prescribe & Co — Configuration Editor
 * Upload to public_html/ alongside index.php
 * Visit yourdomain.com/configure.php to create or update your .env
 * DELETE this file once your site is working (or keep it for re-configuration).
 */

define('ENV_PATH', __DIR__ . '/prescribeandco/.env');

function parseEnv(string $path): array {
    $map = [];
    if (!file_exists($path)) return $map;
    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) continue;
        if (!str_contains($line, '=')) continue;
        [$k, $v] = explode('=', $line, 2);
        $v = trim($v);
        if (strlen($v) >= 2 &&
            (($v[0] === '"' && $v[-1] === '"') || ($v[0] === "'" && $v[-1] === "'"))) {
            $v = substr($v, 1, -1);
        }
        $map[trim($k)] = $v;
    }
    return $map;
}

$errors  = [];
$success = false;
$env     = parseEnv(ENV_PATH);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $appUrl   = rtrim(trim($_POST['app_url'] ?? ''), '/');
    $dbHost   = trim($_POST['db_host']  ?? '127.0.0.1') ?: '127.0.0.1';
    $dbName   = trim($_POST['db_name']  ?? '');
    $dbUser   = trim($_POST['db_user']  ?? '');
    $dbPass   =      $_POST['db_pass']  ?? '';
    $regenKey = !empty($_POST['regen_key']);

    if (!$appUrl) $errors[] = 'App URL is required.';
    if (!$dbName) $errors[] = 'Database name is required.';
    if (!$dbUser) $errors[] = 'Database username is required.';

    if (empty($errors)) {
        // Keep existing APP_KEY unless regenerating or it is missing/invalid
        $appKey = $env['APP_KEY'] ?? '';
        if ($regenKey || !str_starts_with($appKey, 'base64:')) {
            $appKey = 'base64:' . base64_encode(random_bytes(32));
        }

        // Keep existing JWT secrets or generate fresh ones
        $jwtAccess  = $env['JWT_ACCESS_SECRET']  ?: bin2hex(random_bytes(32));
        $jwtRefresh = $env['JWT_REFRESH_SECRET'] ?: bin2hex(random_bytes(32));

        // Preserve any Stripe / AWS values already saved
        $stripeKey     = $env['STRIPE_SECRET_KEY']     ?? '';
        $stripeWebhook = $env['STRIPE_WEBHOOK_SECRET'] ?? '';
        $awsId         = $env['AWS_ACCESS_KEY_ID']     ?? '';
        $awsSecret     = $env['AWS_SECRET_ACCESS_KEY'] ?? '';
        $awsRegion     = $env['AWS_DEFAULT_REGION']    ?: 'eu-west-2';
        $awsBucket     = $env['AWS_BUCKET']            ?? '';
        $s3Ttl         = $env['S3_PRESIGNED_TTL']      ?: '900';

        $content = "APP_NAME=\"Prescribe & Co\"\n"
                 . "APP_ENV=production\n"
                 . "APP_KEY={$appKey}\n"
                 . "APP_DEBUG=false\n"
                 . "APP_URL={$appUrl}\n\n"
                 . "LOG_CHANNEL=single\nLOG_LEVEL=error\n\n"
                 . "DB_CONNECTION=mysql\nDB_HOST={$dbHost}\nDB_PORT=3306\n"
                 . "DB_DATABASE={$dbName}\nDB_USERNAME={$dbUser}\nDB_PASSWORD={$dbPass}\n\n"
                 . "SESSION_DRIVER=file\nSESSION_LIFETIME=120\n"
                 . "SESSION_SECURE_COOKIE=true\nSESSION_ENCRYPT=false\n\n"
                 . "CACHE_STORE=file\n\n"
                 . "JWT_ACCESS_SECRET={$jwtAccess}\nJWT_REFRESH_SECRET={$jwtRefresh}\n"
                 . "JWT_ACCESS_TTL=900\nJWT_REFRESH_TTL=604800\n\n"
                 . "THROTTLE_DEFAULT=20\nTHROTTLE_AUTH=5\nTHROTTLE_REFRESH=10\n\n"
                 . "CORS_ALLOWED_ORIGINS={$appUrl}\n\n"
                 . "STRIPE_SECRET_KEY={$stripeKey}\nSTRIPE_WEBHOOK_SECRET={$stripeWebhook}\n"
                 . "STRIPE_RETURN_URL={$appUrl}/payment/return\n\n"
                 . "AWS_ACCESS_KEY_ID={$awsId}\nAWS_SECRET_ACCESS_KEY={$awsSecret}\n"
                 . "AWS_DEFAULT_REGION={$awsRegion}\nAWS_BUCKET={$awsBucket}\nS3_PRESIGNED_TTL={$s3Ttl}\n";

        $dir = dirname(ENV_PATH);
        if (!is_dir($dir)) {
            $errors[] = '<code>prescribeandco/</code> folder not found — make sure the app files are '
                      . 'in <code>public_html/prescribeandco/</code>.';
        } elseif (file_put_contents(ENV_PATH, $content) !== false) {
            $success = true;
            $env = parseEnv(ENV_PATH);
        } else {
            $errors[] = 'Could not write .env — check that <code>prescribeandco/</code> is writable.';
        }
    }
}

$hasKey    = str_starts_with($env['APP_KEY']     ?? '', 'base64:');
$hasDb     = !empty($env['DB_DATABASE']);
$vendorOk  = is_dir(__DIR__ . '/prescribeandco/vendor');

$fd = [
    'app_url' => htmlspecialchars($_POST['app_url'] ?? $env['APP_URL']      ?? ((isset($_SERVER['HTTPS']) ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? ''))),
    'db_host' => htmlspecialchars($_POST['db_host'] ?? $env['DB_HOST']      ?? '127.0.0.1'),
    'db_name' => htmlspecialchars($_POST['db_name'] ?? $env['DB_DATABASE']  ?? ''),
    'db_user' => htmlspecialchars($_POST['db_user'] ?? $env['DB_USERNAME']  ?? ''),
];
?><!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Configure — Prescribe &amp; Co</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F9F6F0;color:#2C2C2C;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem 1rem}
    .card{background:#fff;border-radius:12px;padding:2.5rem;width:100%;max-width:520px;box-shadow:0 4px 24px rgba(0,0,0,.08)}
    h1{font-size:1.5rem;margin-bottom:.2rem}
    .sub{color:#999;font-size:.875rem;margin-bottom:1.5rem}
    .status{display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:1.5rem}
    .badge{font-size:.75rem;font-weight:600;padding:.3rem .65rem;border-radius:20px}
    .badge.ok{background:#dcfce7;color:#166534}
    .badge.bad{background:#fee2e2;color:#991b1b}
    .badge.warn{background:#fef9c3;color:#854d0e}
    .sec{font-size:.72rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#bbb;margin-top:1.5rem;margin-bottom:.1rem}
    label{display:block;font-size:.85rem;font-weight:600;color:#555;margin-top:1rem;margin-bottom:.3rem}
    input[type=text],input[type=url],input[type=password]{width:100%;padding:.6rem .8rem;border:1px solid #ddd;border-radius:8px;font-size:.95rem}
    input:focus{outline:none;border-color:#9B8EC4}
    .hint{font-size:.77rem;color:#bbb;margin-top:.2rem}
    .check-row{display:flex;align-items:center;gap:.5rem;margin-top:1rem;font-size:.875rem;color:#555}
    .check-row input{width:auto}
    .btn{display:block;width:100%;padding:.85rem;background:#7B6BAE;color:#fff;border:none;border-radius:8px;font-size:1rem;font-weight:600;cursor:pointer;margin-top:1.75rem}
    .btn:hover{background:#6a5a9e}
    .errors{background:#fff0f0;border:1px solid #f5c6cb;border-radius:8px;padding:1rem;margin-bottom:1.25rem}
    .errors p{color:#c0392b;font-size:.875rem;margin:.25rem 0;line-height:1.5}
    .alert-ok{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:1rem;margin-bottom:1.25rem;color:#166534;font-size:.875rem}
    .links{display:flex;gap:.5rem;flex-wrap:wrap;margin-top:1.5rem;padding-top:1.25rem;border-top:1px solid #f0ede8}
    .links a{padding:.5rem 1rem;border-radius:8px;text-decoration:none;font-size:.875rem;font-weight:600}
    .links a.primary{background:#7B6BAE;color:#fff}
    .links a.secondary{background:#f0edf8;color:#7B6BAE}
    .links a.muted{background:#f5f5f5;color:#888}
    .warn-box{background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:.75rem 1rem;font-size:.8rem;color:#854d0e;margin-top:1.25rem}
  </style>
</head>
<body>
<div class="card">
  <h1>Prescribe &amp; Co</h1>
  <p class="sub">Configure database &amp; site settings</p>

  <div class="status">
    <span class="badge <?= $hasKey ? 'ok' : 'bad' ?>">APP_KEY <?= $hasKey ? '✓' : '✗ missing' ?></span>
    <span class="badge <?= $hasDb  ? 'ok' : 'bad' ?>">Database <?= $hasDb  ? '✓ configured' : '✗ not set' ?></span>
    <span class="badge <?= $vendorOk ? 'ok' : 'warn' ?>">vendor/ <?= $vendorOk ? '✓ present' : '⚠ missing' ?></span>
  </div>

  <?php if ($errors): ?>
    <div class="errors"><?php foreach ($errors as $e): ?><p>&#9888; <?= $e ?></p><?php endforeach; ?></div>
  <?php endif; ?>

  <?php if ($success): ?>
    <div class="alert-ok">&#10003; <strong>.env saved.</strong>
      APP_KEY <?= $regenKey ? 'regenerated' : 'kept' ?>.
      <?= $vendorOk ? 'Composer dependencies are present — your site should be working.' : 'Next: run setup.php to install Composer dependencies.' ?>
    </div>
  <?php endif; ?>

  <form method="POST">

    <p class="sec">Site</p>

    <label for="app_url">Domain (APP_URL)</label>
    <input id="app_url" name="app_url" type="url" required
           placeholder="https://yourdomain.com" value="<?= $fd['app_url'] ?>">
    <p class="hint">Full URL — no trailing slash. Must match your actual domain.</p>

    <p class="sec">Database &mdash; hPanel &rarr; MySQL Databases</p>

    <label for="db_host">Host</label>
    <input id="db_host" name="db_host" type="text" value="<?= $fd['db_host'] ?>">
    <p class="hint">Usually <code>127.0.0.1</code> on Hostinger</p>

    <label for="db_name">Database name</label>
    <input id="db_name" name="db_name" type="text" required
           placeholder="u123456789_prescribe" value="<?= $fd['db_name'] ?>">

    <label for="db_user">Username</label>
    <input id="db_user" name="db_user" type="text" required
           placeholder="u123456789_appuser" value="<?= $fd['db_user'] ?>">

    <label for="db_pass">Password</label>
    <input id="db_pass" name="db_pass" type="password" placeholder="Leave blank to keep existing password">
    <p class="hint">Leave blank to keep the password already in .env</p>

    <p class="sec">Security keys</p>

    <div class="check-row">
      <input id="regen_key" name="regen_key" type="checkbox" value="1"
             <?= (!$hasKey ? 'checked' : '') ?>>
      <label for="regen_key" style="margin:0;font-weight:400">
        Generate a new APP_KEY and JWT secrets
        <?= $hasKey ? '<span style="color:#bbb">(keys already set — only tick if you need to rotate them)</span>' : '<strong style="color:#c0392b">(required — no key exists yet)</strong>' ?>
      </label>
    </div>

    <button class="btn" type="submit">Save configuration &rarr;</button>
  </form>

  <div class="links">
    <?php if (!$vendorOk): ?>
      <a href="setup.php" class="primary">Install Composer &rarr;</a>
    <?php endif; ?>
    <a href="check.php" class="secondary">Run diagnostics</a>
    <?php if ($vendorOk && $hasKey && $hasDb): ?>
      <a href="/" class="secondary">Visit site</a>
    <?php endif; ?>
  </div>

  <div class="warn-box">
    &#9888; Delete <strong>configure.php</strong> from File Manager once your site is working.
  </div>
</div>
</body>
</html>
