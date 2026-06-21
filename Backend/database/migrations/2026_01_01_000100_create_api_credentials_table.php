<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('api_credentials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();

            // AES-256-CBC ciphertext (Laravel Crypt). text column — ciphertext is long.
            $table->text('claude_key')->nullable();
            $table->text('gemini_key')->nullable();

            // Plaintext last-4 chars for display only (never the full key).
            $table->string('claude_last4', 8)->nullable();
            $table->string('gemini_last4', 8)->nullable();

            // Set when a live test ping to the provider succeeds.
            $table->timestamp('claude_verified_at')->nullable();
            $table->timestamp('gemini_verified_at')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('api_credentials');
    }
};
