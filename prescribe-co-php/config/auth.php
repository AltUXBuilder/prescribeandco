<?php

return [
    'jwt_access_secret'  => env('JWT_ACCESS_SECRET'),
    'jwt_refresh_secret' => env('JWT_REFRESH_SECRET'),
    'jwt_access_ttl'     => (int) env('JWT_ACCESS_TTL', 900),
    'jwt_refresh_ttl'    => (int) env('JWT_REFRESH_TTL', 604800),
];
