<?php

use App\Models\User;

test('guests cannot export building ifc files', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;

    $response = $this->post(route('export-ifc', [
        'current_team' => $team->slug,
    ]), [
        'width' => 20,
        'depth' => 15,
        'height' => 30,
    ]);

    $response->assertRedirect(route('login'));
});

test('authenticated users can export a building ifc file', function () {
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
            'width' => 20,
            'depth' => 15,
            'height' => 30,
            'rotation' => [0, 0, 0],
            'name' => '20x15x30m building',
        ]);

    $response->assertOk();
    $response->assertHeader('content-type', 'application/x-step');
    expect($response->getContent())->toContain('ISO-10303-21');
    expect($response->getContent())->toContain("FILE_SCHEMA(('IFC4'))");
    expect($response->getContent())->toContain('IFCBUILDINGELEMENTPROXY');
    expect($response->getContent())->toContain('IFCEXTRUDEDAREASOLID');
    expect($response->getContent())->toContain('IFCRELCONTAINEDINSPATIALSTRUCTURE');
});
