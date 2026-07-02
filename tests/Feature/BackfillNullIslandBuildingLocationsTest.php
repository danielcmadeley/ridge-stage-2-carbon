<?php

use App\Models\Building;
use App\Models\Project;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

test('the backfill migration converts null-island buildings to unplaced', function () {
    $project = Project::factory()->for(User::factory()->create()->currentTeam)->create();

    $nullIsland = Building::factory()->for($project)->create([
        'latitude' => 0,
        'longitude' => 0,
        'address_label' => null,
    ]);
    $placed = Building::factory()->for($project)->create([
        'latitude' => 52.4,
        'longitude' => -1.9,
    ]);

    $migration = require base_path('database/migrations/2026_07_02_101439_backfill_null_island_building_locations.php');
    $migration->up();

    expect($nullIsland->fresh()->latitude)->toBeNull()
        ->and($nullIsland->fresh()->longitude)->toBeNull()
        ->and($placed->fresh()->latitude)->toBe(52.4)
        ->and($placed->fresh()->longitude)->toBe(-1.9);
});

test('a backfilled building reads as unplaced through the scene resource', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create();
    Building::factory()->for($project)->create([
        'latitude' => 0,
        'longitude' => 0,
        'address_label' => null,
    ]);

    $migration = require base_path('database/migrations/2026_07_02_101439_backfill_null_island_building_locations.php');
    $migration->up();

    $this->actingAs($user)
        ->get(route('scene', ['current_team' => $user->currentTeam->slug]))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('projects.0.buildings.0')
            ->where('projects.0.buildings.0.origin', null));
});
