<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('generations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            // Step 2 — Ideation form inputs
            $table->text('idea');
            $table->string('industry');
            $table->string('competitors');                 // comma-separated
            $table->text('elements')->nullable();          // optional requested details
            $table->string('reference_url')->nullable();   // optional reference link
            $table->string('reference_path')->nullable();  // optional uploaded file

            // Step 3 — AI pipeline output
            $table->json('claude_json')->nullable();        // structured prompt from Claude
            $table->text('final_prompt')->nullable();       // synthesized NL prompt for the image model
            $table->string('aspect_ratio')->default('9:16');
            $table->string('provider')->nullable();         // 'imagen' | 'gemini-flash'
            $table->string('image_path')->nullable();       // stored generated image

            $table->string('status')->default('pending');   // pending|prompted|generating|completed|failed
            $table->text('error')->nullable();

            $table->timestamps();

            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('generations');
    }
};
