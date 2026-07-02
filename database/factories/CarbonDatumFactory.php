<?php

namespace Database\Factories;

use App\Models\CarbonDatum;
use App\Models\Scheme;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CarbonDatum>
 */
class CarbonDatumFactory extends Factory
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
            'element' => 'columns',
            'mass_kg' => fake()->randomFloat(2, 100, 5000),
            'carbon_kg' => fake()->randomFloat(2, 100, 10000),
        ];
    }
}
