<?php

use App\Http\Controllers\AddressGeocodeController;
use App\Http\Controllers\BuildingController;
use App\Http\Controllers\BuildingIfcExportController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\SaveSchemeController;
use App\Http\Controllers\SceneController;
use App\Http\Controllers\SchemeController;
use App\Http\Controllers\Teams\TeamInvitationController;
use App\Http\Middleware\EnsureTeamMembership;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'Welcome')->name('home');

Route::prefix('{current_team}')
    ->middleware(['auth', 'verified', EnsureTeamMembership::class])
    ->group(function () {
        Route::get('/', DashboardController::class)->name('dashboard');
        Route::get('scene', SceneController::class)->name('scene');
        Route::post('geocode', AddressGeocodeController::class)
            ->middleware('throttle:20,1')
            ->name('geocode');
        Route::post('export-ifc', BuildingIfcExportController::class)
            ->middleware('throttle:20,1')
            ->name('export-ifc');

        Route::post('projects', [ProjectController::class, 'store'])->name('projects.store');
        Route::delete('projects/{project}', [ProjectController::class, 'destroy'])->name('projects.destroy');

        // Persist a building + scheme snapshot (fired when the user clicks Save).
        Route::post('projects/{project}/schemes', SaveSchemeController::class)->name('projects.schemes.save');

        Route::post('projects/{project}/buildings', [BuildingController::class, 'store'])
            ->name('projects.buildings.store');
        Route::patch('projects/{project}/buildings/{building}', [BuildingController::class, 'update'])
            ->name('projects.buildings.update');
        Route::delete('projects/{project}/buildings/{building}', [BuildingController::class, 'destroy'])
            ->name('projects.buildings.destroy');

        Route::post('projects/{project}/buildings/{building}/schemes', [SchemeController::class, 'store'])
            ->name('projects.buildings.schemes.store');
        Route::patch('projects/{project}/buildings/{building}/schemes/{scheme}', [SchemeController::class, 'update'])
            ->name('projects.buildings.schemes.update');
        Route::delete('projects/{project}/buildings/{building}/schemes/{scheme}', [SchemeController::class, 'destroy'])
            ->name('projects.buildings.schemes.destroy');
    });

Route::middleware(['auth'])->group(function () {
    Route::get('invitations/{invitation}/accept', [TeamInvitationController::class, 'accept'])->name('invitations.accept');
    Route::delete('invitations/{invitation}', [TeamInvitationController::class, 'decline'])->name('invitations.decline');
});

require __DIR__.'/settings.php';
