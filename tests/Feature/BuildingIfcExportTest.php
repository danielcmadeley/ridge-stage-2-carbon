<?php

use App\Models\User;

test('guests cannot export building ifc files', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;

    $response = $this->post(route('export-ifc', [
        'current_team' => $team->slug,
    ]), [
        'span' => 24,
        'eavesHeight' => 6,
        'buildingLength' => 40,
        'baySpacing' => 5,
        'deadLoadKnM2' => 1.25,
        'servicesLoadKnM2' => 0.25,
        'liveLoadKnM2' => 0.75,
        'columnRestraint' => 'restrained',
    ]);

    $response->assertRedirect(route('login'));
});

test('authenticated users can export a portal frame ifc file', function () {
    exec('python3 -c "import ifcopenshell" 2>/dev/null', result_code: $resultCode);

    if ($resultCode !== 0) {
        $this->markTestSkipped('IfcOpenShell is not installed.');
    }

    $user = User::factory()->create();
    $team = $user->currentTeam;

    $response = $this
        ->actingAs($user)
        ->post(route('export-ifc', [
            'current_team' => $team->slug,
        ]), [
            'span' => 24,
            'eavesHeight' => 6,
            'buildingLength' => 40,
            'baySpacing' => 5,
            'deadLoadKnM2' => 1.25,
            'servicesLoadKnM2' => 0.25,
            'liveLoadKnM2' => 0.75,
            'columnRestraint' => 'restrained',
            'roofPitchDeg' => 6,
            'rotation' => [0, 0, 0],
            'name' => '24m span portal frame',
        ]);

    $response->assertOk();
    $response->assertHeader('content-type', 'application/x-step');

    $contents = $response->getContent();

    expect($contents)->toContain('ISO-10303-21');
    expect($contents)->toContain("FILE_SCHEMA(('IFC4'))");
    expect($contents)->toContain('IFCCOLUMN');
    expect($contents)->toContain('IFCBEAM');
    expect($contents)->toContain('IFCFOOTING');
    expect($contents)->toContain('IFCSLAB');
    expect($contents)->toContain('IFCISHAPEPROFILEDEF');
    expect($contents)->toContain('IFCRELCONTAINEDINSPATIALSTRUCTURE');
    expect($contents)->toContain('ground-floor-slab');
    expect($contents)->toContain('Ground floor slab');
    expect($contents)->toContain('UB 356x171x67');
    expect($contents)->toContain('UB 533x210x101');
    expect($contents)->toContain('frame-0-rafter-left');
    expect($contents)->toContain('frame-0-haunch-left');
    expect($contents)->toContain('Eaves haunch');
    expect($contents)->toContain('IFCPOLYGONALFACESET');
    expect($contents)->toContain('IFCISHAPEPROFILEDEF');
    expect($contents)->toContain('purlin-left-0');
    expect($contents)->toContain('side-rail-left-0');
    expect($contents)->toContain('202 Z 16');
    expect($contents)->toContain('202 C 16');
    expect($contents)->toContain('Roof purlin');
    expect($contents)->toContain('Side rail');
});

test('authenticated users can export selected two pile cap foundations to ifc', function () {
    exec('python3 -c "import ifcopenshell" 2>/dev/null', result_code: $resultCode);

    if ($resultCode !== 0) {
        $this->markTestSkipped('IfcOpenShell is not installed.');
    }

    $user = User::factory()->create();
    $team = $user->currentTeam;

    $response = $this
        ->actingAs($user)
        ->post(route('export-ifc', [
            'current_team' => $team->slug,
        ]), [
            'span' => 24,
            'eavesHeight' => 6,
            'buildingLength' => 40,
            'baySpacing' => 5,
            'deadLoadKnM2' => 1.25,
            'servicesLoadKnM2' => 0.25,
            'liveLoadKnM2' => 0.75,
            'columnRestraint' => 'restrained',
            'roofPitchDeg' => 6,
            'rotation' => [0, 0, 0],
            'foundation' => [
                'type' => 'two_pile_cap',
                'assumptions' => [
                    'allowableBearingKpa' => 150,
                    'pileWorkingCapacityKn' => 300,
                    'concreteDensityKnM3' => 24,
                    'soilCoverDensityKnM3' => 18,
                    'frictionCoefficient' => 0.45,
                    'concreteCoverM' => 0.05,
                    'reinforcementYieldStrengthMpa' => 500,
                    'preferredBarDiameterMm' => 12,
                ],
            ],
        ]);

    $response->assertOk();

    $contents = $response->getContent();

    expect($contents)->toContain('IFCFOOTING');
    expect($contents)->toContain('IFCPILE');
    expect($contents)->toContain('frame-0-footing-left');
    expect($contents)->toContain('frame-0-pile-left-a');
    expect($contents)->toContain('frame-0-pile-left-b');
});

test('authenticated users can export selected mass filled foundations to ifc', function () {
    exec('python3 -c "import ifcopenshell" 2>/dev/null', result_code: $resultCode);

    if ($resultCode !== 0) {
        $this->markTestSkipped('IfcOpenShell is not installed.');
    }

    $user = User::factory()->create();
    $team = $user->currentTeam;

    $response = $this
        ->actingAs($user)
        ->post(route('export-ifc', [
            'current_team' => $team->slug,
        ]), [
            'span' => 24,
            'eavesHeight' => 6,
            'buildingLength' => 40,
            'baySpacing' => 5,
            'deadLoadKnM2' => 1.25,
            'servicesLoadKnM2' => 0.25,
            'liveLoadKnM2' => 0.75,
            'columnRestraint' => 'restrained',
            'roofPitchDeg' => 6,
            'rotation' => [0, 0, 0],
            'foundation' => [
                'type' => 'mass_filled',
                'assumptions' => [
                    'allowableBearingKpa' => 150,
                    'pileWorkingCapacityKn' => 300,
                    'concreteDensityKnM3' => 24,
                    'soilCoverDensityKnM3' => 18,
                    'frictionCoefficient' => 0.45,
                    'concreteCoverM' => 0.05,
                    'reinforcementYieldStrengthMpa' => 500,
                    'preferredBarDiameterMm' => 12,
                ],
            ],
        ]);

    $response->assertOk();

    $contents = $response->getContent();

    expect($contents)->toContain('IFCFOOTING');
    expect($contents)->toContain('Mass-filled foundation');
    expect($contents)->toContain('frame-0-footing-left');
    expect($contents)->not->toContain('IFCPILE');
});
