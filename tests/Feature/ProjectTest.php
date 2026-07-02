<?php

use App\Models\Building;
use App\Models\Project;
use App\Models\Scheme;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('a team member can create a project scoped to their team', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post(
        route('projects.store', ['current_team' => $user->currentTeam->slug]),
        ['name' => 'Riverside Depot', 'client' => 'Acme', 'project_number' => 'P1001'],
    )->assertRedirect();

    $this->assertDatabaseHas('projects', [
        'team_id' => $user->currentTeam->id,
        'name' => 'Riverside Depot',
        'client' => 'Acme',
        'project_number' => 'P1001',
        'created_by' => $user->id,
    ]);

    expect(Project::sole()->slug)->toBe('riverside-depot');
});

test('creating a project via json returns the persisted project', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->postJson(
        route('projects.store', ['current_team' => $user->currentTeam->slug]),
        ['name' => 'Riverside Depot'],
    )->assertCreated()
        ->assertJsonPath('name', 'Riverside Depot')
        ->assertJsonPath('slug', 'riverside-depot');

    $this->assertDatabaseHas('projects', [
        'team_id' => $user->currentTeam->id,
        'name' => 'Riverside Depot',
    ]);
});

test('creating a project requires a name', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post(
        route('projects.store', ['current_team' => $user->currentTeam->slug]),
        ['name' => ''],
    )->assertSessionHasErrors('name');
});

test('a non-member cannot create a project for another team', function () {
    $owner = User::factory()->create();
    $outsider = User::factory()->create();

    $this->actingAs($outsider)->post(
        route('projects.store', ['current_team' => $owner->currentTeam->slug]),
        ['name' => 'Sneaky Project'],
    )->assertForbidden();

    expect(Project::count())->toBe(0);
});

test('creating a project from the dashboard redirects back to the dashboard', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post(
        route('projects.store', ['current_team' => $user->currentTeam->slug]),
        ['name' => 'Riverside Depot', 'client' => 'Acme', 'project_number' => 'P1001'],
    )->assertRedirect(route('dashboard', ['current_team' => $user->currentTeam->slug]));

    $this->assertDatabaseHas('projects', [
        'team_id' => $user->currentTeam->id,
        'name' => 'Riverside Depot',
    ]);
});

test('the legacy projects page is not available', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get("/{$user->currentTeam->slug}/projects")
        ->assertMethodNotAllowed();
});

test('the scene page includes the teams projects and buildings', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create(['name' => 'Depot One']);
    $building = Building::factory()->for($project)->create(['name' => 'Shed A']);
    Scheme::factory()->for($building)->create();

    $this->actingAs($user)
        ->get(route('scene', ['current_team' => $user->currentTeam->slug]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Scene')
            ->has('projects', 1)
            ->where('projects.0.name', 'Depot One')
            ->has('projects.0.buildings', 1)
            ->where('projects.0.buildings.0.name', 'Shed A')
            ->has('projects.0.buildings.0.schemes', 1),
        );
});

test('a team member can delete a building', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create();
    $building = Building::factory()->for($project)->create();

    $this->actingAs($user)->delete(route('projects.buildings.destroy', [
        'current_team' => $user->currentTeam->slug,
        'project' => $project->slug,
        'building' => $building->slug,
    ]))->assertRedirect();

    $this->assertSoftDeleted($building);
});

test('deleting the preferred scheme repoints the building to a remaining scheme', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create();
    $building = Building::factory()->for($project)->create();

    $keep = Scheme::factory()->for($building)->create();
    $remove = Scheme::factory()->for($building)->create();
    $building->update(['preferred_scheme_id' => $remove->id]);

    $this->actingAs($user)->delete(route('projects.buildings.schemes.destroy', [
        'current_team' => $user->currentTeam->slug,
        'project' => $project->slug,
        'building' => $building->slug,
        'scheme' => $remove->id,
    ]))->assertRedirect();

    $this->assertSoftDeleted($remove);
    expect($building->fresh()->preferred_scheme_id)->toBe($keep->id);
});
