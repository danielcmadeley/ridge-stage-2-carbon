<?php

namespace Database\Factories;

use App\Models\FrameMember;
use App\Models\Scheme;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FrameMember>
 */
class FrameMemberFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'scheme_id' => Scheme::factory(),
            'role' => 'column',
            'start_x' => 0,
            'start_y' => 0,
            'start_z' => 0,
            'end_x' => 0,
            'end_y' => 0,
            'end_z' => 6,
            'section_profile' => 'ub',
            'section_name' => '457x191x67 UB',
            'section' => ['profile' => 'ub', 'name' => '457x191x67 UB', 'massPerMKg' => 67.1],
            'length_m' => 6,
            'mass_kg' => 402.6,
            'footing' => null,
            'pile' => null,
        ];
    }
}
