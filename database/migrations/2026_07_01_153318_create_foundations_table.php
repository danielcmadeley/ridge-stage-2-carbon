<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('foundations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('scheme_id')->constrained()->cascadeOnDelete();
            $table->string('side');
            $table->string('type');
            $table->string('label')->nullable();
            $table->decimal('width_m', 10, 4);
            $table->decimal('depth_m', 10, 4);
            $table->decimal('height_m', 10, 4);
            $table->json('checks');
            $table->json('reinforcement')->nullable();
            $table->json('pile_cap')->nullable();
            $table->json('calculation_lines')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('foundations');
    }
};
