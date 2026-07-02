<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('frame_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('scheme_id')->constrained()->cascadeOnDelete();
            $table->string('role');
            $table->double('start_x');
            $table->double('start_y');
            $table->double('start_z');
            $table->double('end_x');
            $table->double('end_y');
            $table->double('end_z');
            $table->string('section_profile');
            $table->string('section_name');
            $table->json('section');
            $table->decimal('length_m', 10, 4);
            $table->decimal('mass_kg', 12, 4);
            $table->json('footing')->nullable();
            $table->json('pile')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('frame_members');
    }
};
