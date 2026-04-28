<?php
/**
 * Prescribe & Co — Browser Installer
 * Place this file in public_html/ alongside index.php
 * Visit https://yourdomain.com/setup.php once after uploading.
 * Deletes itself when setup is complete.
 */

// App root is the prescribeandco/ subfolder
define('ROOT', __DIR__ . '/prescribeandco');
define('ENV_PATH', ROOT . '/.env');

// Already set up? Block access
if (file_exists(ENV_PATH)) {
    $content = file_get_contents(ENV_PATH);
    if (strpos($content, 'APP_KEY=base64:') !== false) {
        http_response_code(404);
        die('<h2>Setup already complete.</h2><p><a href="/">Go to site</a></p>');
    }
}

function run(string $cmd): array {
    $output = []; $code = 0;
    exec($cmd . ' 2>&1', $output, $code);
    return ['output' => implode("\n", $output), 'ok' => $code === 0];
}

/**
 * Returns the full command to invoke Composer (e.g. "composer", "php8.3 /path/composer.phar").
 * Returns null if nothing works.
 */
function findComposerCmd(): ?string {
    // PHP CLI binaries to try (Hostinger uses CloudLinux; php8.3 is common)
    $phpBins = ['php8.3', 'php8.2', 'php8.1', 'php', '/usr/local/bin/php', '/usr/bin/php'];

    // 1. Composer as a standalone binary (not a phar)
    $composerBins = ['/usr/local/bin/composer', '/usr/bin/composer'];
    foreach ($composerBins as $bin) {
        if (file_exists($bin)) {
            $r = run("$bin --version");
            if ($r['ok']) return $bin;
            // File exists but not self-executable — try with a php binary
            foreach ($phpBins as $php) {
                $r2 = run("$php $bin --version");
                if ($r2['ok']) return "$php $bin";
            }
        }
    }

    // 2. composer in PATH
    $r = run('composer --version');
    if ($r['ok']) return 'composer';

    // 3. which composer
    $r = run('which composer');
    if ($r['ok'] && ($path = trim($r['output'])) !== '') {
        $r2 = run("$path --version");
        if ($r2['ok']) return $path;
    }

    // 4. composer.phar already present (uploaded manually or from previous run)
    $pharPaths = [
        ROOT . '/composer.phar',
        __DIR__ . '/composer.phar',
        '/usr/local/bin/composer.phar',
    ];
    foreach ($pharPaths as $phar) {
        if (file_exists($phar)) {
            foreach ($phpBins as $php) {
                $r = run("$php $phar --version");
                if ($r['ok']) return "$php $phar";
            }
        }
    }

    // 5. Download composer.phar as a last resort
    $localPhar = ROOT . '/composer.phar';
    $downloaded = false;
    if (function_exists('curl_init')) {
        $ch = curl_init('https://getcomposer.org/composer-stable.phar');
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true, CURLOPT_TIMEOUT => 60]);
        $data = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($data && $httpCode === 200) {
            file_put_contents($localPhar, $data);
            $downloaded = true;
        }
    } elseif (ini_get('allow_url_fopen')) {
        $data = @file_get_contents('https://getcomposer.org/composer-stable.phar');
        if ($data) {
            file_put_contents($localPhar, $data);
            $downloaded = true;
        }
    }

    if ($downloaded && file_exists($localPhar)) {
        foreach ($phpBins as $php) {
            $r = run("$php $localPhar --version");
            if ($r['ok']) return "$php $localPhar";
        }
    }

    return null;
}

$errors = [];
$log    = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $siteUrl = rtrim(trim($_POST['app_url'] ?? ''), '/');
    $dbHost  = trim($_POST['db_host']  ?? '127.0.0.1') ?: '127.0.0.1';
    $dbName  = trim($_POST['db_name']  ?? '');
    $dbUser  = trim($_POST['db_user']  ?? '');
    $dbPass  =      $_POST['db_pass']  ?? '';

    if (!$siteUrl) $errors[] = 'Site URL is required.';
    if (!$dbName)  $errors[] = 'Database name is required.';
    if (!$dbUser)  $errors[] = 'Database username is required.';

    // Test DB connection and check tables
    if (empty($errors)) {
        try {
            $pdo = new PDO(
                "mysql:host={$dbHost};port=3306;dbname={$dbName};charset=utf8mb4",
                $dbUser, $dbPass,
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 5]
            );
            $tables = $pdo->query("SHOW TABLES LIKE 'users'")->fetchAll();
            if (empty($tables)) {
                $errors[] = 'Connected but tables are missing — run <strong>prescribeandco.sql</strong> in phpMyAdmin first.';
            } else {
                $log[] = '&#10003; Database connected and tables found.';
            }
        } catch (PDOException $e) {
            $errors[] = 'Database connection failed: ' . htmlspecialchars($e->getMessage());
        }
    }

    // Install Composer dependencies if vendor/ missing
    if (empty($errors) && !is_dir(ROOT . '/vendor')) {
        $composerCmd = findComposerCmd();
        if (!$composerCmd) {
            $errors[] = 'Composer not found on this server and could not be downloaded automatically.<br>'
                      . 'Please contact Hostinger support and ask them to run:<br>'
                      . '<pre>cd ~/public_html/prescribeandco &amp;&amp; composer install --no-dev</pre>'
                      . 'Or upload the <code>vendor/</code> folder manually via File Manager.';
        } else {
            $result = run("cd " . escapeshellarg(ROOT) . " && {$composerCmd} install --no-dev --optimize-autoloader --no-interaction");
            if ($result['ok']) {
                $log[] = '&#10003; Dependencies installed.';
            } else {
                $errors[] = 'Composer install failed. Command used: <code>' . htmlspecialchars($composerCmd) . '</code><br>'
                          . '<pre>' . htmlspecialchars($result['output']) . '</pre>'
                          . '<strong>Fix:</strong> Contact Hostinger support and ask them to run:<br>'
                          . '<pre>cd ~/public_html/prescribeandco &amp;&amp; composer install --no-dev</pre>';
            }
        }
    } elseif (is_dir(ROOT . '/vendor')) {
        $log[] = '&#10003; Dependencies already present.';
    }

    // Write .env
    if (empty($errors)) {
        $appKey     = 'base64:' . base64_encode(random_bytes(32));
        $jwtAccess  = bin2hex(random_bytes(32));
        $jwtRefresh = bin2hex(random_bytes(32));

        $env = "APP_NAME=\"Prescribe & Co\"\n"
             . "APP_ENV=production\n"
             . "APP_KEY={$appKey}\n"
             . "APP_DEBUG=false\n"
             . "APP_URL={$siteUrl}\n\n"
             . "LOG_CHANNEL=single\nLOG_LEVEL=error\n\n"
             . "DB_CONNECTION=mysql\nDB_HOST={$dbHost}\nDB_PORT=3306\n"
             . "DB_DATABASE={$dbName}\nDB_USERNAME={$dbUser}\nDB_PASSWORD={$dbPass}\n\n"
             . "SESSION_DRIVER=file\nSESSION_LIFETIME=120\n"
             . "SESSION_SECURE_COOKIE=false\nSESSION_ENCRYPT=false\n\n"
             . "CACHE_STORE=file\n\n"
             . "JWT_ACCESS_SECRET={$jwtAccess}\nJWT_REFRESH_SECRET={$jwtRefresh}\n"
             . "JWT_ACCESS_TTL=900\nJWT_REFRESH_TTL=604800\n\n"
             . "THROTTLE_DEFAULT=20\nTHROTTLE_AUTH=5\nTHROTTLE_REFRESH=10\n\n"
             . "CORS_ALLOWED_ORIGINS={$siteUrl}\n\n"
             . "STRIPE_SECRET_KEY=\nSTRIPE_WEBHOOK_SECRET=\n"
             . "STRIPE_RETURN_URL={$siteUrl}/payment/return\n\n"
             . "AWS_ACCESS_KEY_ID=\nAWS_SECRET_ACCESS_KEY=\n"
             . "AWS_DEFAULT_REGION=eu-west-2\nAWS_BUCKET=\nS3_PRESIGNED_TTL=900\n";

        if (file_put_contents(ENV_PATH, $env) !== false) {
            $log[] = '&#10003; Configuration file written.';
        } else {
            $errors[] = 'Could not write .env — check that <code>prescribeandco/</code> is writable.';
        }
    }

    // Write .htaccess (hidden file — often missing from ZIP downloads)
    if (empty($errors)) {
        $htaccess = <<<'HTACCESS'
<IfModule mod_rewrite.c>
    <IfModule mod_negotiation.c>
        Options -MultiViews -Indexes
    </IfModule>

    RewriteEngine On

    RewriteCond %{HTTP:Authorization} .
    RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]

    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_URI} (.+)/$
    RewriteRule ^ %1 [L,R=301]

    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteRule ^ index.php [L]
</IfModule>
HTACCESS;
        $htaccessPath = __DIR__ . '/.htaccess';
        if (!file_exists($htaccessPath)) {
            file_put_contents($htaccessPath, $htaccess);
        }
        $log[] = '&#10003; .htaccess written.';
    }

    // Set storage permissions
    if (empty($errors)) {
        foreach ([
            ROOT . '/storage/framework/sessions',
            ROOT . '/storage/framework/views',
            ROOT . '/storage/framework/cache/data',
            ROOT . '/storage/logs',
            ROOT . '/bootstrap/cache',
        ] as $dir) {
            if (!is_dir($dir)) mkdir($dir, 0775, true);
            @chmod($dir, 0775);
        }
        $log[] = '&#10003; Permissions set.';
        $log[] = '&#10003; Setup complete — installer removed.';
        @unlink(__FILE__);
    }
}

$formData = [
    'app_url' => htmlspecialchars($_POST['app_url'] ?? ((isset($_SERVER['HTTPS']) ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? ''))),
    'db_host' => htmlspecialchars($_POST['db_host'] ?? '127.0.0.1'),
    'db_name' => htmlspecialchars($_POST['db_name'] ?? ''),
    'db_user' => htmlspecialchars($_POST['db_user'] ?? ''),
];
$done = !empty($log) && strpos(implode('', $log), 'complete') !== false;
?><!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Prescribe &amp; Co — Setup</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F9F6F0;color:#2C2C2C;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem 1rem}
    .card{background:#fff;border-radius:12px;padding:2.5rem;width:100%;max-width:520px;box-shadow:0 4px 24px rgba(0,0,0,.08)}
    h1{font-size:1.5rem;margin-bottom:.2rem}
    .sub{color:#999;font-size:.875rem;margin-bottom:2rem}
    .sec{font-size:.72rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#bbb;margin-top:1.5rem;margin-bottom:.1rem}
    label{display:block;font-size:.85rem;font-weight:600;color:#555;margin-top:1rem;margin-bottom:.3rem}
    input{width:100%;padding:.6rem .8rem;border:1px solid #ddd;border-radius:8px;font-size:.95rem}
    input:focus{outline:none;border-color:#9B8EC4}
    .hint{font-size:.77rem;color:#bbb;margin-top:.2rem}
    .btn{display:block;width:100%;padding:.85rem;background:#7B6BAE;color:#fff;border:none;border-radius:8px;font-size:1rem;font-weight:600;cursor:pointer;margin-top:1.75rem}
    .btn:hover{background:#6a5a9e}
    .errors{background:#fff0f0;border:1px solid #f5c6cb;border-radius:8px;padding:1rem;margin-bottom:1.25rem}
    .errors p{color:#c0392b;font-size:.875rem;margin:.25rem 0;line-height:1.5}
    .log{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:1rem;margin-bottom:1.25rem}
    .log p{color:#166534;font-size:.875rem;margin:.2rem 0}
    .success{text-align:center}
    .tick{font-size:3rem;margin-bottom:1rem}
    .success h2{color:#166534;font-size:1.3rem;margin-bottom:.75rem}
    .success p{color:#555;font-size:.9rem;margin-bottom:1.25rem}
    .links a{display:inline-block;margin:.3rem .2rem;padding:.55rem 1.1rem;background:#7B6BAE;color:#fff;border-radius:8px;text-decoration:none;font-size:.875rem;font-weight:600}
    .links a.sec{background:#f0edf8;color:#7B6BAE}
    pre{font-size:.75rem;white-space:pre-wrap;word-break:break-all;background:#f8f8f8;padding:.5rem;border-radius:4px;margin:.3rem 0}
  </style>
</head>
<body>
<div class="card">
<?php if ($done): ?>
  <div class="success">
    <div class="tick">&#10003;</div>
    <h2>Setup complete!</h2>
    <p>Your site is configured and ready.</p>
    <div class="links">
      <a href="/">Visit site</a>
      <a href="/register" class="sec">Create account</a>
      <a href="/api/v1/health" class="sec">API health</a>
    </div>
  </div>
<?php else: ?>
  <h1>Prescribe &amp; Co</h1>
  <p class="sub">First-time setup &mdash; takes about 60 seconds</p>
  <?php if ($errors): ?>
    <div class="errors"><?php foreach ($errors as $e): ?><p>&#9888; <?= $e ?></p><?php endforeach; ?></div>
  <?php endif; ?>
  <?php if ($log): ?>
    <div class="log"><?php foreach ($log as $l): ?><p><?= $l ?></p><?php endforeach; ?></div>
  <?php endif; ?>
  <form method="POST">
    <p class="sec">Your site</p>
    <label>Domain</label>
    <input name="app_url" type="url" required placeholder="https://yourdomain.com" value="<?= $formData['app_url'] ?>">
    <p class="hint">Your full domain — no trailing slash</p>
    <p class="sec">Database &mdash; from hPanel &rarr; MySQL Databases</p>
    <label>Host</label>
    <input name="db_host" type="text" value="<?= $formData['db_host'] ?>">
    <label>Database name</label>
    <input name="db_name" type="text" required placeholder="u123456789_prescribe" value="<?= $formData['db_name'] ?>">
    <label>Username</label>
    <input name="db_user" type="text" required placeholder="u123456789_appuser" value="<?= $formData['db_user'] ?>">
    <label>Password</label>
    <input name="db_pass" type="password" placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;">
    <button class="btn" type="submit">Install now &rarr;</button>
  </form>
<?php endif; ?>
</div>
</body>
</html>
