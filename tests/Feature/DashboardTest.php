<?php

use App\Enums\SchemeStatus;
use App\Models\Building;
use App\Models\Project;
use App\Models\Scheme;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected to the login page when visiting the dashboard', function () {
    User::factory()->create();

    $response = $this->get(route('dashboard'));

    $response->assertRedirect(route('login'));
});

test('authenticated users land on the dashboard after login', function () {
    $user = User::factory()->create();

    $response = $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('dashboard'));
});

test('the dashboard lists the teams projects grouped with buildings and schemes', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create(['name' => 'Depot One']);
    $building = Building::factory()->for($project)->create(['name' => 'Shed A']);
    Scheme::factory()->for($building)->create();

    $this->actingAs($user)
        ->get(route('dashboard', ['current_team' => $user->currentTeam->slug]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard')
            ->has('projects', 1)
            ->where('projects.0.name', 'Depot One')
            ->has('projects.0.buildings', 1)
            ->where('projects.0.buildings.0.name', 'Shed A')
            ->has('projects.0.buildings.0.schemes', 1),
        );
});

test('a team member can create a building within a project', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create();

    $this->actingAs($user)->post(route('projects.buildings.store', [
        'current_team' => $user->currentTeam->slug,
        'project' => $project->slug,
    ]), [
        'name' => 'Warehouse 7',
        'latitude' => 51.5,
        'longitude' => -0.12,
    ])->assertRedirect();

    $this->assertDatabaseHas('buildings', [
        'project_id' => $project->id,
        'name' => 'Warehouse 7',
        'created_by' => $user->id,
    ]);

    expect(Building::sole()->slug)->toBe('warehouse-7');
});

test('creating a building requires a name', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create();

    $this->actingAs($user)->post(route('projects.buildings.store', [
        'current_team' => $user->currentTeam->slug,
        'project' => $project->slug,
    ]), ['name' => ''])->assertSessionHasErrors('name');
});

test('a team member can update a buildings metadata', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create();
    $building = Building::factory()->for($project)->create(['name' => 'Old Name']);

    $this->actingAs($user)->patch(route('projects.buildings.update', [
        'current_team' => $user->currentTeam->slug,
        'project' => $project->slug,
        'building' => $building->slug,
    ]), [
        'name' => 'New Name',
    ])->assertRedirect();

    $this->assertDatabaseHas('buildings', [
        'id' => $building->id,
        'name' => 'New Name',
    ]);
});

test('a non-member cannot create a building for another team', function () {
    $owner = User::factory()->create();
    $outsider = User::factory()->create();
    $project = Project::factory()->for($owner->currentTeam)->create();

    $this->actingAs($outsider)->post(route('projects.buildings.store', [
        'current_team' => $owner->currentTeam->slug,
        'project' => $project->slug,
    ]), ['name' => 'Sneaky'])->assertForbidden();

    expect(Building::count())->toBe(0);
});

test('a team member can create a draft scheme on a building', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create();
    $building = Building::factory()->for($project)->create();

    $this->actingAs($user)->post(route('projects.buildings.schemes.store', [
        'current_team' => $user->currentTeam->slug,
        'project' => $project->slug,
        'building' => $building->slug,
    ]), ['name' => 'Option A'])->assertRedirect();

    $scheme = Scheme::sole();
    expect($scheme->building_id)->toBe($building->id)
        ->and($scheme->status)->toBe(SchemeStatus::Draft)
        ->and($scheme->name)->toBe('Option A')
        ->and($scheme->span)->toBe(24.0);
});

test('a building can be created without a location', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create();

    $this->actingAs($user)->post(route('projects.buildings.store', [
        'current_team' => $user->currentTeam->slug,
        'project' => $project->slug,
    ]), ['name' => 'Unplaced Shed'])->assertRedirect();

    $building = Building::sole();

    expect($building->name)->toBe('Unplaced Shed')
        ->and($building->latitude)->toBeNull()
        ->and($building->longitude)->toBeNull();
});

test('renaming a building without a location keeps the location empty', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create();
    $building = Building::factory()->for($project)->create([
        'latitude' => null,
        'longitude' => null,
    ]);

    $this->actingAs($user)->patch(route('projects.buildings.update', [
        'current_team' => $user->currentTeam->slug,
        'project' => $project->slug,
        'building' => $building->slug,
    ]), ['name' => 'Renamed'])->assertRedirect();

    $building->refresh();

    expect($building->name)->toBe('Renamed')
        ->and($building->latitude)->toBeNull()
        ->and($building->longitude)->toBeNull();
});

test('verifying a scheme demotes the previously verified scheme on the building', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create();
    $building = Building::factory()->for($project)->create();
    $previous = Scheme::factory()->for($building)->verified()->create();
    $scheme = Scheme::factory()->for($building)->create();

    $this->actingAs($user)->patch(route('projects.buildings.schemes.update', [
        'current_team' => $user->currentTeam->slug,
        'project' => $project->slug,
        'building' => $building->slug,
        'scheme' => $scheme->id,
    ]), ['status' => 'verified'])->assertRedirect();

    expect($scheme->fresh())
        ->status->toBe(SchemeStatus::Verified)
        ->verified_by->toBe($user->id)
        ->and($previous->fresh())
        ->status->toBe(SchemeStatus::Draft)
        ->verified_by->toBeNull();
});

test('marking a verified scheme as draft clears the verifier', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create();
    $building = Building::factory()->for($project)->create();
    $scheme = Scheme::factory()->for($building)->verified()->create();

    $this->actingAs($user)->patch(route('projects.buildings.schemes.update', [
        'current_team' => $user->currentTeam->slug,
        'project' => $project->slug,
        'building' => $building->slug,
        'scheme' => $scheme->id,
    ]), ['status' => 'draft'])->assertRedirect();

    expect($scheme->fresh())
        ->status->toBe(SchemeStatus::Draft)
        ->verified_by->toBeNull();
});

test('a scheme cannot be toggled to archived through the status update', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create();
    $building = Building::factory()->for($project)->create();
    $scheme = Scheme::factory()->for($building)->create();

    $this->actingAs($user)->patch(route('projects.buildings.schemes.update', [
        'current_team' => $user->currentTeam->slug,
        'project' => $project->slug,
        'building' => $building->slug,
        'scheme' => $scheme->id,
    ]), ['status' => 'archived'])->assertSessionHasErrors('status');
});

test('the dashboard lists the verified scheme first', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create();
    $building = Building::factory()->for($project)->create();
    $verified = Scheme::factory()->for($building)->verified()->create([
        'created_at' => now()->subDay(),
    ]);
    Scheme::factory()->for($building)->create(['created_at' => now()]);

    $this->actingAs($user)
        ->get(route('dashboard', ['current_team' => $user->currentTeam->slug]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard')
            ->has('projects.0.buildings.0.schemes', 2)
            ->where('projects.0.buildings.0.schemes.0.id', $verified->id)
            ->where('projects.0.buildings.0.schemes.0.status', 'verified'),
        );
});

test('a team member can rename a scheme', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create();
    $building = Building::factory()->for($project)->create();
    $scheme = Scheme::factory()->for($building)->create(['name' => 'Old']);

    $this->actingAs($user)->patch(route('projects.buildings.schemes.update', [
        'current_team' => $user->currentTeam->slug,
        'project' => $project->slug,
        'building' => $building->slug,
        'scheme' => $scheme->id,
    ]), ['name' => 'New'])->assertRedirect();

    expect($scheme->fresh()->name)->toBe('New');
});

test('the scene filters to a single building when a building is selected', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create();
    $focused = Building::factory()->for($project)->create(['name' => 'Focused']);
    Building::factory()->for($project)->create(['name' => 'Other']);

    $this->actingAs($user)
        ->get(route('scene', [
            'current_team' => $user->currentTeam->slug,
            'building' => $focused->slug,
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Scene')
            ->has('projects', 1)
            ->has('projects.0.buildings', 1)
            ->where('projects.0.buildings.0.name', 'Focused')
            ->where('focusBuildingSlug', $focused->slug),
        );
});
