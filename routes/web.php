<?php

use App\Http\Controllers\AddressGeocodeController;
use App\Http\Controllers\BuildingIfcExportController;
use App\Http\Controllers\SceneController;
use App\Http\Controllers\Teams\TeamInvitationController;
use App\Http\Middleware\EnsureTeamMembership;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'Welcome')->name('home');

Route::prefix('{current_team}')
    ->middleware(['auth', 'verified', EnsureTeamMembership::class])
    ->group(function () {
        Route::get('scene', SceneController::class)->name('scene');
        Route::post('geocode', AddressGeocodeController::class)
            ->middleware('throttle:20,1')
            ->name('geocode');
        Route::post('export-ifc', BuildingIfcExportController::class)
            ->middleware('throttle:20,1')
            ->name('export-ifc');
    });

Route::middleware(['auth'])->group(function () {
    Route::get('invitations/{invitation}/accept', [TeamInvitationController::class, 'accept'])->name('invitations.accept');
    Route::delete('invitations/{invitation}', [TeamInvitationController::class, 'decline'])->name('invitations.decline');
});

require __DIR__.'/settings.php';
