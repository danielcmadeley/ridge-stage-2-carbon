<?php

use App\Models\Building;
use App\Models\Project;
use App\Models\User;

test('a team member can update building placement via json without resending the name', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create();
    $building = Building::factory()->for($project)->create([
        'name' => 'Shed A',
        'latitude' => null,
        'longitude' => null,
        'address_label' => null,
    ]);

    $this->actingAs($user)
        ->patchJson(route('projects.buildings.update', [
            'current_team' => $user->currentTeam->slug,
            'project' => $project->slug,
            'building' => $building->slug,
        ]), [
            'latitude' => 52.4,
            'longitude' => -1.9,
            'address_label' => '1 Warehouse Way',
            'rotation' => [0, 45, 0],
        ])
        ->assertSuccessful()
        ->assertJsonPath('building.name', 'Shed A')
        ->assertJsonPath('building.addressLabel', '1 Warehouse Way')
        ->assertJsonPath('building.origin', [-1.9, 52.4]);

    $building->refresh();

    expect($building->name)->toBe('Shed A')
        ->and($building->latitude)->toBe(52.4)
        ->and($building->longitude)->toBe(-1.9)
        ->and($building->address_label)->toBe('1 Warehouse Way')
        ->and($building->rotation_y)->toBe(45.0);
});

test('a team member can clear a building location via json', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create();
    $building = Building::factory()->for($project)->create([
        'latitude' => 52.4,
        'longitude' => -1.9,
        'address_label' => '1 Warehouse Way',
    ]);

    $this->actingAs($user)
        ->patchJson(route('projects.buildings.update', [
            'current_team' => $user->currentTeam->slug,
            'project' => $project->slug,
            'building' => $building->slug,
        ]), [
            'latitude' => null,
            'longitude' => null,
            'address_label' => null,
        ])
        ->assertSuccessful()
        ->assertJsonPath('building.origin', null)
        ->assertJsonPath('building.addressLabel', null);

    $building->refresh();

    expect($building->latitude)->toBeNull()
        ->and($building->longitude)->toBeNull()
        ->and($building->address_label)->toBeNull();
});
