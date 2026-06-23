<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('generations', function (Blueprint $table) {
            // Claude's market-research output (web-search grounded).
            $table->json('market_read')->nullable()->after('claude_json');
            // Array of generated image paths (one per variation). image_path stays
            // as the primary (= first element) for backward compat.
            $table->json('image_paths')->nullable()->after('image_path');
        });
    }

    public function down(): void
    {
        Schema::table('generations', function (Blueprint $table) {
            $table->dropColumn(['market_read', 'image_paths']);
        });
    }
};
