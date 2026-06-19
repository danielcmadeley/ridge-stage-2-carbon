<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected to the login page when visiting scene', function () {
    User::factory()->create();

    $response = $this->get(route('scene'));

    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the scene page', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get(route('scene'));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page->component('Scene'));
});
