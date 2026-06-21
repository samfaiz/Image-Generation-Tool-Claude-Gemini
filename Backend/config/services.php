<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Dual-AI providers
    |--------------------------------------------------------------------------
    | Only models/endpoints live here. The actual per-user API keys are stored
    | encrypted (AES-256-CBC) in the `api_credentials` table, never in config.
    */

    'anthropic' => [
        'base_url' => rtrim(env('ANTHROPIC_BASE_URL', 'https://api.anthropic.com'), '/'),
        'version' => env('ANTHROPIC_VERSION', '2023-06-01'),
        'model' => env('CLAUDE_MODEL', 'claude-opus-4-8'),
    ],

    'gemini' => [
        'base_url' => rtrim(env('GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta'), '/'),
        'imagen_model' => env('GEMINI_IMAGEN_MODEL', 'imagen-3.0-generate-002'),
        'flash_image_model' => env('GEMINI_FLASH_IMAGE_MODEL', 'gemini-2.5-flash-image'),
    ],

];
