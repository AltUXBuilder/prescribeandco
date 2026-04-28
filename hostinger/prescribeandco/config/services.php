<?php

return [
    'stripe' => [
        'secret'         => env('STRIPE_SECRET_KEY'),
        'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
        'return_url'     => env('STRIPE_RETURN_URL'),
    ],

    'aws' => [
        'key'          => env('AWS_ACCESS_KEY_ID'),
        'secret'       => env('AWS_SECRET_ACCESS_KEY'),
        'region'       => env('AWS_DEFAULT_REGION', 'eu-west-2'),
        'bucket'       => env('AWS_BUCKET'),
        'presigned_ttl'=> (int) env('S3_PRESIGNED_TTL', 900),
    ],
];
