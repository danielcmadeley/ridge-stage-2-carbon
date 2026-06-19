<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected to the login page when visiting pdf', function () {
    $user = User::factory()->create();

    $response = $this->get(route('pdf'));

    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the pdf page', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get(route('pdf'));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page->component('Pdf'));
});
