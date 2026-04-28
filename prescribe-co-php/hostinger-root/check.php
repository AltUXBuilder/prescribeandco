<?php
// ============================================================
// Prescribe & Co — Diagnostic Tool
// Upload to public_html/ and visit yourdomain.com/check.php
// DELETE this file once the site is working.
// ============================================================

$root = __DIR__ . '/prescribeandco';
?><!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Diagnostics</title>
  <style>
    body { font-family: sans-serif; max-width: 700px; margin: 2rem auto; padding: 0 1rem; background: #f9f9f9; }
    h1   { font-size: 1.4rem; margin-bottom: 1.5rem; }
    h2   { font-size: 1rem; margin: 1.5rem 0 .5rem; color: #555; text-transform: uppercase; letter-spacing: .05em; }
    .ok  { color: #166534; font-weight: 600; }
    .bad { color: #c0392b; font-weight: 600; }
    .row { padding: .4rem 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; }
    .label { color: #333; }
    pre  { background: #fff; border: 1px solid #ddd; padding: 1rem; border-radius: 6px;
           font-size: .8rem; overflow-x: auto; white-space: pre-wrap; word-break: break-all; }
    .fix { background: #fff8e1; border: 1px solid #ffe082; border-radius: 6px;
           padding: 1rem; margin-top: .5rem; font-size: .875rem; }
  </style>
</head>
<body>
<h1>Prescribe &amp; Co — Diagnostics</h1>

<?php
// ── 1. PHP version ─────────────────────────────────────────────
echo '<h2>Server</h2>';
$phpOk = version_compare(PHP_VERSION, '8.2.0', '>=');
echo '<div class="row"><span class="label">PHP version</span><span class="' . ($phpOk ? 'ok' : 'bad') . '">' . PHP_VERSION . ($phpOk ? ' ✓' : ' ✗ — needs 8.2+') . '</span></div>';
echo '<div class="row"><span class="label">App root</span><span>' . $root . '</span></div>';
echo '<div class="row"><span class="label">prescribeandco/ folder</span><span class="' . (is_dir($root) ? 'ok">found ✓' : 'bad">NOT FOUND ✗') . '</span></div>';

// ── 2. Critical files/folders ───────────────────────────────────
echo '<h2>Files &amp; Folders</h2>';
$items = [
    'vendor/autoload.php'            => 'Composer dependencies',
    '.env'                           => 'Config file (.env)',
    'bootstrap/app.php'              => 'Laravel bootstrap',
    'bootstrap/cache'                => 'Bootstrap cache dir',
    'storage/framework/sessions'     => 'Sessions directory',
    'storage/framework/views'        => 'Views cache directory',
    'storage/framework/cache/data'   => 'Cache directory',
    'storage/logs'                   => 'Logs directory',
    'public/css/app.css'             => 'Stylesheet',
    'routes/web.php'                 => 'Web routes',
];
foreach ($items as $path => $label) {
    $full   = $root . '/' . $path;
    $exists = file_exists($full) || is_dir($full);
    echo '<div class="row"><span class="label">' . $label . ' <small style="color:#999">(' . $path . ')</small></span>'
       . '<span class="' . ($exists ? 'ok">✓ found' : 'bad">✗ MISSING') . '</span></div>';
}

// ── 3. .env contents ───────────────────────────────────────────
echo '<h2>.env Check</h2>';
$envPath = $root . '/.env';
if (!file_exists($envPath)) {
    echo '<div class="bad">✗ .env file not found at ' . $envPath . '</div>';
    echo '<div class="fix">Run setup.php again, or create .env manually in the prescribeandco/ folder.</div>';
} else {
    $env = file_get_contents($envPath);
    $envChecks = [
        'APP_KEY=base64:'  => 'APP_KEY generated',
        'APP_URL=http'     => 'APP_URL set',
        'DB_DATABASE='     => 'DB_DATABASE set',
        'DB_USERNAME='     => 'DB_USERNAME set',
        'DB_PASSWORD='     => 'DB_PASSWORD set',
        'SESSION_DRIVER='  => 'SESSION_DRIVER set',
    ];
    foreach ($envChecks as $needle => $label) {
        $found = strpos($env, $needle) !== false;
        // Extra check: key exists but is empty
        if ($needle === 'APP_KEY=base64:') {
            $found = strpos($env, 'APP_KEY=base64:') !== false;
        }
        echo '<div class="row"><span class="label">' . $label . '</span>'
           . '<span class="' . ($found ? 'ok">✓' : 'bad">✗ MISSING') . '</span></div>';
    }

    // Check APP_KEY specifically
    if (strpos($env, 'APP_KEY=') !== false && strpos($env, 'APP_KEY=base64:') === false) {
        echo '<div class="fix">✗ APP_KEY exists but is empty or invalid. It must start with <code>base64:</code> — re-run setup.php to regenerate it.</div>';
    }
}

// ── 4. Autoloader test ─────────────────────────────────────────
echo '<h2>Autoloader Test</h2>';
$autoloader = $root . '/vendor/autoload.php';
if (!file_exists($autoloader)) {
    echo '<div class="bad">✗ vendor/autoload.php missing — Composer has not been installed.</div>';
    echo '<div class="fix">Try running setup.php again — it will attempt to find or download Composer automatically.<br>'
       . 'If it keeps failing, contact Hostinger support and ask them to run:<br>'
       . '<code>cd ~/public_html/prescribeandco &amp;&amp; composer install --no-dev</code><br><br>'
       . 'Or in hPanel → Advanced → SSH Terminal, run:<br>'
       . '<code>php8.3 /usr/local/bin/composer install --no-dev --working-dir=~/public_html/prescribeandco</code></div>';
} else {
    try {
        require_once $autoloader;
        echo '<div class="ok">✓ Autoloader loaded successfully.</div>';
    } catch (\Throwable $e) {
        echo '<div class="bad">✗ Autoloader failed: ' . htmlspecialchars($e->getMessage()) . '</div>';
    }
}

// ── 5. Storage writable ────────────────────────────────────────
echo '<h2>Permissions</h2>';
$dirs = [
    $root . '/storage/framework/sessions',
    $root . '/storage/framework/views',
    $root . '/storage/framework/cache/data',
    $root . '/storage/logs',
    $root . '/bootstrap/cache',
];
foreach ($dirs as $dir) {
    if (!is_dir($dir)) { @mkdir($dir, 0775, true); }
    $writable = is_writable($dir);
    echo '<div class="row"><span class="label">' . str_replace($root . '/', '', $dir) . '</span>'
       . '<span class="' . ($writable ? 'ok">✓ writable' : 'bad">✗ NOT writable') . '</span></div>';
}

// ── 6. Log tail ────────────────────────────────────────────────
echo '<h2>Latest Log Entries</h2>';
$logFile = $root . '/storage/logs/laravel.log';
if (!file_exists($logFile)) {
    echo '<div style="color:#999">No log file yet — the app has not booted successfully.</div>';
} else {
    $lines = array_slice(file($logFile), -30);
    echo '<pre>' . htmlspecialchars(implode('', $lines)) . '</pre>';
}

// ── 7. index.php check ────────────────────────────────────────
echo '<h2>public_html/index.php</h2>';
$idx = __DIR__ . '/index.php';
if (!file_exists($idx)) {
    echo '<div class="bad">✗ index.php not found in public_html/ — upload it from hostinger-root/index.php</div>';
} else {
    $content = file_get_contents($idx);
    $hasRoot = strpos($content, 'prescribeandco') !== false;
    echo '<div class="' . ($hasRoot ? 'ok">✓ index.php found and references prescribeandco/' : 'bad">✗ index.php found but may be the wrong version') . '</div>';
}
?>

<p style="margin-top:2rem;font-size:.8rem;color:#999">
  Delete this file once your site is working: <strong>public_html/check.php</strong>
</p>
</body>
</html>
