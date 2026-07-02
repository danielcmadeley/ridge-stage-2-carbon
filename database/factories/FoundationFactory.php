<?php

namespace Database\Factories;

use App\Models\Foundation;
use App\Models\Scheme;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Foundation>
 */
class FoundationFactory extends Factory
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
            'side' => 'left',
            'type' => 'reinforced_pad',
            'label' => 'Reinforced pad',
            'width_m' => 2.4,
            'depth_m' => 2.4,
            'height_m' => 0.6,
            'checks' => [],
            'reinforcement' => null,
            'pile_cap' => null,
            'calculation_lines' => [],
        ];
    }
}
