<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Buildings created before the "make location nullable" migration were
     * saved with latitude = 0 and longitude = 0 as the "no placement" sentinel
     * (the columns were non-nullable then). Now that the columns are nullable,
     * those sentinels resolve to a real point at null island (0, 0), which the
     * BuildingResource treats as placed and which sits outside the UK map
     * bounds — so the building vanishes on reload. Convert them to NULL so the
     * building is correctly recognised as unplaced.
     */
    public function up(): void
    {
        DB::table('buildings')
            ->where('latitude', 0)
            ->where('longitude', 0)
            ->update([
                'latitude' => null,
                'longitude' => null,
            ]);
    }

    public function down(): void
    {
        // No-op: we cannot reconstruct the original sentinel values from NULL,
        // and restoring (0, 0) would reintroduce the null-island bug.
    }
};
