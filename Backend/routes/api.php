<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CredentialController;
use App\Http\Controllers\Api\GenerationController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API routes (Sanctum SPA / cookie auth)
|--------------------------------------------------------------------------
*/

// Guest
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Authenticated
Route::middleware(['auth:sanctum', 'track.active'])->group(function () {
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Encrypted API key vault
    Route::get('/credentials', [CredentialController::class, 'show']);
    Route::put('/credentials', [CredentialController::class, 'update']);
    Route::delete('/credentials', [CredentialController::class, 'destroy']);

    // Live image-model catalog for the user's Gemini key
    Route::get('/models', [CredentialController::class, 'models']);

    // Generations
    Route::get('/generations', [GenerationController::class, 'index']);
    Route::post('/generations', [GenerationController::class, 'store']);            // phase 1 (Claude)
    Route::get('/generations/{generation}', [GenerationController::class, 'show']);
    Route::post('/generations/{generation}/image', [GenerationController::class, 'image']); // phase 2 (Gemini)
    Route::get('/generations/{generation}/image', [GenerationController::class, 'imageFile'])
        ->name('api.generations.image');                                            // canvas-safe proxy
    Route::delete('/generations/{generation}', [GenerationController::class, 'destroy']);
});
