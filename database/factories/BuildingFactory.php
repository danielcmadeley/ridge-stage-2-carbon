<?php

namespace Database\Factories;

use App\Models\Building;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Building>
 */
class BuildingFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'created_by' => User::factory(),
            'name' => fake()->unique()->streetName().' Warehouse',
            'latitude' => fake()->latitude(50, 58),
            'longitude' => fake()->longitude(-5, 1),
            'altitude' => fake()->randomFloat(2, 0, 200),
            'address_label' => fake()->address(),
            'rotation_x' => 0,
            'rotation_y' => 0,
            'rotation_z' => fake()->randomFloat(3, 0, 6.28),
        ];
    }
}
