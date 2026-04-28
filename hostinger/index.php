<?php

use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// App lives in prescribeandco/ subfolder inside public_html
$appRoot = __DIR__ . '/prescribeandco';

if (file_exists($appRoot . '/storage/framework/maintenance.php')) {
    require $appRoot . '/storage/framework/maintenance.php';
}

require $appRoot . '/vendor/autoload.php';

$app = require_once $appRoot . '/bootstrap/app.php';

$app->handleRequest(Request::capture());
