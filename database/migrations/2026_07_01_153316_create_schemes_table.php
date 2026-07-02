<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('schemes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('building_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('calculated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status')->default('draft');
            $table->string('name')->nullable();

            // Portal-frame design inputs (mirror App\Data\PortalFrameDesign).
            $table->decimal('span', 8, 3);
            $table->decimal('eaves_height', 8, 3);
            $table->decimal('building_length', 8, 3);
            $table->decimal('bay_spacing', 8, 3);
            $table->decimal('dead_load_kn_m2', 8, 3);
            $table->decimal('live_load_kn_m2', 8, 3);
            $table->string('column_restraint')->default('restrained');
            $table->decimal('roof_pitch_deg', 6, 3)->default(6);
            $table->string('foundation_type')->default('reinforced_pad');
            $table->json('foundation_assumptions');

            // Carbon rollups (populated on Save from the frontend-computed results).
            $table->decimal('total_steel_kg', 12, 3)->nullable();
            $table->decimal('total_carbon_kg', 12, 3)->nullable();
            $table->decimal('carbon_intensity_kg_m2', 10, 3)->nullable();
            $table->decimal('floor_area_m2', 10, 3)->nullable();
            $table->string('scors_band')->nullable();

            $table->timestamps();
            $table->softDeletes();
        });

        Schema::table('buildings', function (Blueprint $table) {
            $table->foreign('preferred_scheme_id')
                ->references('id')
                ->on('schemes')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('buildings', function (Blueprint $table) {
            $table->dropForeign(['preferred_scheme_id']);
        });

        Schema::dropIfExists('schemes');
    }
};
