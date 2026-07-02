<?php

use App\Enums\SchemeStatus;
use App\Models\Project;
use App\Models\Scheme;
use App\Models\User;

/**
 * A full Save payload matching SaveSchemeRequest.
 *
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function saveSchemePayload(array $overrides = []): array
{
    $payload = [
        'building' => [
            'name' => 'Distribution Shed',
            'latitude' => 52.4,
            'longitude' => -1.9,
            'altitude' => 120.5,
            'addressLabel' => '1 Warehouse Way',
            'rotation' => [0, 0, 1.2],
        ],
        'scheme' => [
            'name' => 'Option A',
            'span' => 24,
            'eavesHeight' => 6,
            'buildingLength' => 40,
            'baySpacing' => 5,
            'deadLoadKnM2' => 1.25,
            'servicesLoadKnM2' => 0.25,
            'liveLoadKnM2' => 0.75,
            'columnRestraint' => 'restrained',
            'roofPitchDeg' => 6,
            'foundation' => [
                'type' => 'reinforced_pad',
                'assumptions' => [
                    'allowableBearingKpa' => 150,
                    'pileWorkingCapacityKn' => 300,
                    'pileDiameterM' => 0.45,
                    'pileSpacingFactor' => 3,
                    'concreteDensityKnM3' => 24,
                    'soilCoverDensityKnM3' => 18,
                    'frictionCoefficient' => 0.45,
                    'concreteCoverM' => 0.05,
                    'reinforcementYieldStrengthMpa' => 500,
                    'preferredBarDiameterMm' => 12,
                ],
            ],
        ],
        'carbon' => [
            'totalCarbonKg' => 42000,
            'floorAreaM2' => 960,
            'carbonIntensityKgM2' => 43.75,
            'scorsBand' => 'A',
            'breakdown' => [
                'columns' => ['massKg' => 2400, 'carbonKg' => 5000],
                'rafters' => ['massKg' => 1800, 'carbonKg' => 3800],
                'concrete' => ['massKg' => 50000, 'carbonKg' => 6000],
            ],
        ],
        'members' => [
            [
                'role' => 'column',
                'start' => [0, 0, 0],
                'end' => [0, 0, 6],
                'section' => ['profile' => 'ub', 'name' => '457x191x67 UB', 'massPerMKg' => 67.1],
            ],
            [
                'role' => 'rafter',
                'start' => [0, 0, 6],
                'end' => [12, 0, 7.26],
                'section' => ['profile' => 'ub', 'name' => '457x191x67 UB', 'massPerMKg' => 67.1],
            ],
        ],
        'foundations' => [
            [
                'side' => 'left',
                'type' => 'reinforced_pad',
                'label' => 'Reinforced pad',
                'dimensions' => ['widthM' => 2.4, 'depthM' => 2.4, 'heightM' => 0.6],
                'checks' => [['label' => 'Bearing', 'passes' => true]],
                'calculationLines' => ['line 1'],
            ],
            [
                'side' => 'right',
                'type' => 'reinforced_pad',
                'label' => 'Reinforced pad',
                'dimensions' => ['widthM' => 2.4, 'depthM' => 2.4, 'heightM' => 0.6],
                'checks' => [['label' => 'Bearing', 'passes' => true]],
                'calculationLines' => ['line 1'],
            ],
        ],
    ];

    return array_replace_recursive($payload, $overrides);
}

function saveSchemeUrl(User $user, Project $project): string
{
    return route('projects.schemes.save', [
        'current_team' => $user->currentTeam->slug,
        'project' => $project->slug,
    ]);
}

test('saving persists the building, scheme, snapshot and rollups', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create();

    $response = $this->actingAs($user)->postJson(
        saveSchemeUrl($user, $project),
        saveSchemePayload(),
    );

    $response->assertOk()
        ->assertJsonPath('scheme.design.span', 24)
        ->assertJsonPath('building.name', 'Distribution Shed');

    $this->assertDatabaseHas('buildings', [
        'project_id' => $project->id,
        'name' => 'Distribution Shed',
        'created_by' => $user->id,
    ]);

    $scheme = Scheme::sole();

    expect($scheme->total_carbon_kg)->toBe(42000.0)
        ->and($scheme->carbon_intensity_kg_m2)->toBe(43.75)
        ->and($scheme->scors_band)->toBe('A')
        // total steel = columns + rafters masses (concrete excluded).
        ->and($scheme->total_steel_kg)->toBe(4200.0)
        ->and($scheme->calculated_by)->toBe($user->id);

    expect($scheme->frameMembers()->count())->toBe(2)
        ->and($scheme->foundations()->count())->toBe(2)
        ->and($scheme->carbonData()->count())->toBe(3);

    // The preferred scheme is set on the building.
    expect($scheme->building->preferred_scheme_id)->toBe($scheme->id);
});

test('re-saving an existing scheme replaces snapshot rows instead of duplicating', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create();

    $first = $this->actingAs($user)->postJson(
        saveSchemeUrl($user, $project),
        saveSchemePayload(),
    )->assertOk();

    $buildingId = $first->json('building.id');
    $schemeId = $first->json('scheme.id');

    $this->actingAs($user)->postJson(
        saveSchemeUrl($user, $project),
        saveSchemePayload([
            'building' => ['id' => $buildingId],
            'scheme' => ['id' => $schemeId, 'span' => 30],
        ]),
    )->assertOk()->assertJsonPath('scheme.design.span', 30);

    // Still one building and one scheme; snapshot rows replaced, not appended.
    expect(Scheme::count())->toBe(1);

    $scheme = Scheme::sole();

    expect($scheme->id)->toBe($schemeId)
        ->and($scheme->span)->toBe(30.0)
        ->and($scheme->frameMembers()->count())->toBe(2)
        ->and($scheme->foundations()->count())->toBe(2)
        ->and($scheme->carbonData()->count())->toBe(3);
});

test('a building can be saved without a map placement', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create();

    $payload = saveSchemePayload();
    unset(
        $payload['building']['latitude'],
        $payload['building']['longitude'],
        $payload['building']['altitude'],
        $payload['building']['rotation'],
    );

    $this->actingAs($user)->postJson(
        saveSchemeUrl($user, $project),
        $payload,
    )->assertOk()->assertJsonPath('building.origin', null);

    $building = Scheme::sole()->building;

    expect($building->latitude)->toBeNull()
        ->and($building->longitude)->toBeNull();
});

test('a scheme-only save leaves the building untouched', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create();

    $first = $this->actingAs($user)->postJson(
        saveSchemeUrl($user, $project),
        saveSchemePayload(),
    )->assertOk();

    $payload = saveSchemePayload([
        'scheme' => ['id' => $first->json('scheme.id'), 'span' => 30],
    ]);
    // A scheme-only save identifies the building without re-sending its
    // name or placement.
    $payload['building'] = ['id' => $first->json('building.id')];

    $this->actingAs($user)->postJson(
        saveSchemeUrl($user, $project),
        $payload,
    )->assertOk()->assertJsonPath('scheme.design.span', 30);

    $building = Scheme::sole()->building;

    expect($building->name)->toBe('Distribution Shed')
        ->and($building->latitude)->toBe(52.4)
        ->and($building->longitude)->toBe(-1.9)
        ->and($building->address_label)->toBe('1 Warehouse Way');
});

test('a scheme-only save keeps the scheme name and verified status', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create();

    $first = $this->actingAs($user)->postJson(
        saveSchemeUrl($user, $project),
        saveSchemePayload(),
    )->assertOk();

    $scheme = Scheme::sole();
    $scheme->update(['status' => SchemeStatus::Verified, 'verified_by' => $user->id]);

    $payload = saveSchemePayload(['scheme' => ['id' => $scheme->id]]);
    $payload['building'] = ['id' => $first->json('building.id')];
    unset($payload['scheme']['name']);

    $this->actingAs($user)->postJson(
        saveSchemeUrl($user, $project),
        $payload,
    )->assertOk();

    expect($scheme->fresh())
        ->name->toBe('Option A')
        ->status->toBe(SchemeStatus::Verified);
});

test('saving a new building requires a name', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create();

    $payload = saveSchemePayload();
    unset($payload['building']['name']);

    $this->actingAs($user)->postJson(
        saveSchemeUrl($user, $project),
        $payload,
    )->assertUnprocessable()->assertJsonValidationErrors('building.name');
});

test('a user cannot save into another teams project', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->for($owner->currentTeam)->create();

    $outsider = User::factory()->create();

    $this->actingAs($outsider)->postJson(
        route('projects.schemes.save', [
            'current_team' => $owner->currentTeam->slug,
            'project' => $project->slug,
        ]),
        saveSchemePayload(),
    )->assertForbidden();

    expect(Scheme::count())->toBe(0);
});

test('saving validates the payload', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user->currentTeam)->create();

    $this->actingAs($user)->postJson(
        saveSchemeUrl($user, $project),
        saveSchemePayload(['scheme' => ['span' => null]]),
    )->assertUnprocessable()->assertJsonValidationErrors('scheme.span');
});
