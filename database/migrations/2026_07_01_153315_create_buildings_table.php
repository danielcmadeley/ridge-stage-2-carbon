<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('buildings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name');
            $table->string('slug');

            // Placement (map location + rotation in radians).
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->decimal('altitude', 8, 3)->nullable();
            $table->string('address_label')->nullable();
            $table->double('rotation_x')->default(0);
            $table->double('rotation_y')->default(0);
            $table->double('rotation_z')->default(0);

            // The preferred scheme FK is added once the schemes table exists.
            $table->unsignedBigInteger('preferred_scheme_id')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->unique(['project_id', 'slug']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('buildings');
    }
};
