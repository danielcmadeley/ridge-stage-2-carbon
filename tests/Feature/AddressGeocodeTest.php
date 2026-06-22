<?php

use App\Models\User;
use Illuminate\Support\Facades\Http;

test('guests cannot geocode addresses', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;

    $response = $this->postJson(route('geocode', [
        'current_team' => $team->slug,
    ]), [
        'q' => 'SW1A 1AA',
    ]);

    $response->assertRedirect(route('login'));
});

test('authenticated users can geocode a uk address', function () {
    Http::fake([
        'nominatim.openstreetmap.org/*' => Http::response([
            [
                'lat' => '51.501009',
                'lon' => '-0.141588',
                'display_name' => 'Buckingham Palace, London, SW1A 1AA, United Kingdom',
            ],
        ]),
    ]);

    $user = User::factory()->create();
    $team = $user->currentTeam;

    $response = $this
        ->actingAs($user)
        ->postJson(route('geocode', [
            'current_team' => $team->slug,
        ]), [
            'q' => 'SW1A 1AA',
        ]);

    $response->assertOk();
    $response->assertJsonPath('results.0.label', 'Buckingham Palace, London, SW1A 1AA, United Kingdom');
    $response->assertJsonPath('results.0.lng', -0.141588);
    $response->assertJsonPath('results.0.lat', 51.501009);
});
