<?php
/**
 * Prescribe & Co — Installer (Composer + permissions)
 * Upload to public_html/ alongside index.php
 * Run configure.php FIRST to set up your .env, then visit setup.php
 * This file deletes itself when complete.
 */

define('ROOT', __DIR__ . '/prescribeandco');
define('ENV_PATH', ROOT . '/.env');

// Block access once fully installed
if (file_exists(ENV_PATH) && is_dir(ROOT . '/vendor')) {
    $env = file_get_contents(ENV_PATH);
    if (strpos($env, 'APP_KEY=base64:') !== false) {
        http_response_code(404);
        die('<h2>Already installed.</h2><p><a href="/">Go to site</a></p>');
    }
}

function run(string $cmd): array {
    $output = []; $code = 0;
    exec($cmd . ' 2>&1', $output, $code);
    return ['output' => implode("\n", $output), 'ok' => $code === 0];
}

/**
 * Returns the full command needed to invoke Composer.
 * Tries standalone binaries, PHP+phar combinations, and downloads
 * composer-stable.phar as a last resort.
 */
function findComposerCmd(): ?string {
    $phpBins = ['php8.3', 'php8.2', 'php8.1', 'php', '/usr/local/bin/php', '/usr/bin/php'];

    // 1. Standalone composer binary
    foreach (['/usr/local/bin/composer', '/usr/bin/composer'] as $bin) {
        if (file_exists($bin)) {
            if (run("$bin --version")['ok']) return $bin;
            foreach ($phpBins as $php) {
                if (run("$php $bin --version")['ok']) return "$php $bin";
            }
        }
    }

    // 2. composer in PATH
    if (run('composer --version')['ok']) return 'composer';

    // 3. which composer
    $r = run('which composer');
    if ($r['ok'] && ($path = trim($r['output'])) !== '') {
        if (run("$path --version")['ok']) return $path;
    }

    // 4. composer.phar already present
    foreach ([ROOT . '/composer.phar', __DIR__ . '/composer.phar', '/usr/local/bin/composer.phar'] as $phar) {
        if (file_exists($phar)) {
            foreach ($phpBins as $php) {
                if (run("$php $phar --version")['ok']) return "$php $phar";
            }
        }
    }

    // 5. Download composer.phar as a last resort
    $localPhar  = ROOT . '/composer.phar';
    $downloaded = false;
    $pharUrl    = 'https://getcomposer.org/composer-stable.phar';

    if (function_exists('curl_init')) {
        $ch = curl_init($pharUrl);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true, CURLOPT_TIMEOUT => 60]);
        $data     = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($data && $httpCode === 200) { file_put_contents($localPhar, $data); $downloaded = true; }
    } elseif (ini_get('allow_url_fopen')) {
        $data = @file_get_contents($pharUrl);
        if ($data) { file_put_contents($localPhar, $data); $downloaded = true; }
    }

    if ($downloaded && file_exists($localPhar)) {
        foreach ($phpBins as $php) {
            if (run("$php $localPhar --version")['ok']) return "$php $localPhar";
        }
    }

    return null;
}

// ── Pre-flight checks ─────────────────────────────────────────────────────────
$envExists  = file_exists(ENV_PATH);
$envContent = $envExists ? file_get_contents(ENV_PATH) : '';
$envReady   = $envExists
    && strpos($envContent, 'APP_KEY=base64:') !== false
    && preg_match('/^DB_DATABASE=.+/m', $envContent);

$errors = [];
$log    = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $envReady) {

    // Install Composer dependencies if vendor/ is missing
    if (!is_dir(ROOT . '/vendor')) {
        $composerCmd = findComposerCmd();
        if (!$composerCmd) {
            $errors[] = 'Composer not found on this server and could not be downloaded.<br>'
                      . 'Contact Hostinger support and ask them to run via SSH Terminal:<br>'
                      . '<pre>php8.3 /usr/local/bin/composer install --no-dev --working-dir=~/public_html/prescribeandco</pre>'
                      . 'Or upload the <code>vendor/</code> folder via File Manager.';
        } else {
            $result = run("cd " . escapeshellarg(ROOT) . " && {$composerCmd} install --no-dev --optimize-autoloader --no-interaction");
            if ($result['ok']) {
                $log[] = '&#10003; Composer dependencies installed.';
            } else {
                $errors[] = 'Composer install failed (command: <code>' . htmlspecialchars($composerCmd) . '</code>)<br>'
                          . '<pre>' . htmlspecialchars($result['output']) . '</pre>'
                          . '<strong>Manual fix:</strong> In hPanel → Advanced → SSH Terminal, run:<br>'
                          . '<pre>php8.3 /usr/local/bin/composer install --no-dev --working-dir=~/public_html/prescribeandco</pre>';
            }
        }
    } else {
        $log[] = '&#10003; Composer dependencies already present.';
    }

    // Set storage / cache permissions
    if (empty($errors)) {
        $dirs = [
            ROOT . '/storage/framework/sessions',
            ROOT . '/storage/framework/views',
            ROOT . '/storage/framework/cache/data',
            ROOT . '/storage/logs',
            ROOT . '/bootstrap/cache',
        ];
        foreach ($dirs as $dir) {
            if (!is_dir($dir)) mkdir($dir, 0775, true);
            @chmod($dir, 0775);
        }
        $log[] = '&#10003; Permissions set.';
        $log[] = '&#10003; Installation complete.';
        @unlink(__FILE__);
    }
}

$done = !empty($log) && strpos(implode('', $log), 'complete') !== false;
?><!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Install — Prescribe &amp; Co</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F9F6F0;color:#2C2C2C;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem 1rem}
    .card{background:#fff;border-radius:12px;padding:2.5rem;width:100%;max-width:520px;box-shadow:0 4px 24px rgba(0,0,0,.08)}
    h1{font-size:1.5rem;margin-bottom:.2rem}
    .sub{color:#999;font-size:.875rem;margin-bottom:1.5rem}
    .checklist{margin-bottom:1.5rem}
    .check-item{display:flex;align-items:center;gap:.6rem;padding:.45rem 0;border-bottom:1px solid #f0ede8;font-size:.9rem}
    .check-item:last-child{border-bottom:none}
    .icon-ok{color:#166534;font-weight:700}
    .icon-bad{color:#c0392b;font-weight:700}
    .icon-warn{color:#854d0e;font-weight:700}
    .pre-flight{background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:1rem;margin-bottom:1.25rem;font-size:.875rem;color:#854d0e}
    .pre-flight a{color:#7B6BAE;font-weight:600}
    .btn{display:block;width:100%;padding:.85rem;background:#7B6BAE;color:#fff;border:none;border-radius:8px;font-size:1rem;font-weight:600;cursor:pointer;margin-top:1.75rem}
    .btn:hover{background:#6a5a9e}
    .btn:disabled{background:#bbb;cursor:default}
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
    <h2>Installation complete!</h2>
    <p>Your site is configured and ready to use.</p>
    <div class="links">
      <a href="/">Visit site</a>
      <a href="/register" class="sec">Create account</a>
      <a href="/api/v1/health" class="sec">API health</a>
    </div>
  </div>

<?php else: ?>

  <h1>Prescribe &amp; Co</h1>
  <p class="sub">Install Composer dependencies &amp; set permissions</p>

  {{-- Pre-flight status ─────────────────────────────────────────────────────── --}}
  <div class="checklist">
    <div class="check-item">
      <span class="<?= $envExists ? 'icon-ok' : 'icon-bad' ?>"><?= $envExists ? '✓' : '✗' ?></span>
      <span>.env file <?= $envExists ? 'found' : 'missing — run <a href="configure.php" style="color:#7B6BAE;font-weight:600">configure.php</a> first' ?></span>
    </div>
    <div class="check-item">
      <span class="<?= ($envExists && strpos($envContent, 'APP_KEY=base64:') !== false) ? 'icon-ok' : 'icon-bad' ?>">
        <?= ($envExists && strpos($envContent, 'APP_KEY=base64:') !== false) ? '✓' : '✗' ?>
      </span>
      <span>APP_KEY <?= ($envExists && strpos($envContent, 'APP_KEY=base64:') !== false) ? 'present' : 'missing — <a href="configure.php" style="color:#7B6BAE;font-weight:600">configure.php</a>' ?></span>
    </div>
    <div class="check-item">
      <span class="<?= ($envExists && preg_match('/^DB_DATABASE=.+/m', $envContent)) ? 'icon-ok' : 'icon-bad' ?>">
        <?= ($envExists && preg_match('/^DB_DATABASE=.+/m', $envContent)) ? '✓' : '✗' ?>
      </span>
      <span>Database <?= ($envExists && preg_match('/^DB_DATABASE=.+/m', $envContent)) ? 'configured' : 'not configured — <a href="configure.php" style="color:#7B6BAE;font-weight:600">configure.php</a>' ?></span>
    </div>
    <div class="check-item">
      <span class="<?= is_dir(ROOT . '/vendor') ? 'icon-ok' : 'icon-warn' ?>">
        <?= is_dir(ROOT . '/vendor') ? '✓' : '⚠' ?>
      </span>
      <span>vendor/ <?= is_dir(ROOT . '/vendor') ? 'present' : 'missing — install below' ?></span>
    </div>
  </div>

  <?php if (!$envReady): ?>
    <div class="pre-flight">
      &#9888; <strong>Configure first.</strong>
      Your .env is missing or incomplete. Visit
      <a href="configure.php">configure.php</a> to set your database credentials and generate your APP_KEY,
      then return here to install.
    </div>
  <?php endif; ?>

  <?php if ($errors): ?>
    <div class="errors"><?php foreach ($errors as $e): ?><p>&#9888; <?= $e ?></p><?php endforeach; ?></div>
  <?php endif; ?>

  <?php if ($log): ?>
    <div class="log"><?php foreach ($log as $l): ?><p><?= $l ?></p><?php endforeach; ?></div>
  <?php endif; ?>

  <form method="POST">
    <button class="btn" type="submit" <?= $envReady ? '' : 'disabled' ?>>
      <?= is_dir(ROOT . '/vendor') ? 'Set permissions &amp; finish' : 'Install Composer &amp; set permissions' ?> &rarr;
    </button>
  </form>

  <p style="margin-top:1rem;text-align:center;font-size:.8rem;color:#bbb">
    <a href="configure.php" style="color:#7B6BAE">&#8592; Edit configuration</a>
    &nbsp;&nbsp;
    <a href="check.php" style="color:#7B6BAE">Diagnostics</a>
  </p>

<?php endif; ?>

</div>
</body>
</html>
