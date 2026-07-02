<?php

namespace Database\Factories;

use App\Data\PortalFrameDesign;
use App\Enums\SchemeStatus;
use App\Models\Building;
use App\Models\Scheme;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Scheme>
 */
class SchemeFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $design = PortalFrameDesign::defaults();

        return [
            'building_id' => Building::factory(),
            'created_by' => User::factory(),
            'status' => SchemeStatus::Draft,
            'name' => 'Option '.fake()->randomLetter(),
            'span' => $design->span,
            'eaves_height' => $design->eavesHeight,
            'building_length' => $design->buildingLength,
            'bay_spacing' => $design->baySpacing,
            'dead_load_kn_m2' => $design->deadLoadKnM2,
            'services_load_kn_m2' => $design->servicesLoadKnM2,
            'live_load_kn_m2' => $design->liveLoadKnM2,
            'column_restraint' => $design->columnRestraint,
            'roof_pitch_deg' => $design->roofPitchDeg,
            'foundation_type' => $design->foundationType,
            'foundation_assumptions' => $design->foundationAssumptions,
        ];
    }

    public function verified(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => SchemeStatus::Verified,
            'verified_by' => User::factory(),
        ]);
    }
}
