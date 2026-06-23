<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('generations', function (Blueprint $table) {
            // Array of stored paths. First entry is the primary (sent to Gemini);
            // all entries are sent to Claude vision when engineering the prompt.
            $table->json('reference_paths')->nullable()->after('reference_path');
        });
    }

    public function down(): void
    {
        Schema::table('generations', function (Blueprint $table) {
            $table->dropColumn('reference_paths');
        });
    }
};
