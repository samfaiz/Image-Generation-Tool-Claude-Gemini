<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | For Sanctum SPA (cookie) auth, the frontend and API must be on the same
    | top-level site so the session cookie is sent. We run both on `localhost`
    | (NOT 127.0.0.1). `supports_credentials` MUST be true so the browser sends
    | and stores the session + XSRF cookies on cross-origin (cross-port) calls.
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie', 'login', 'logout', 'register'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        env('FRONTEND_URL', 'http://localhost:3000'),
        'http://localhost:3000',
    ],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];
