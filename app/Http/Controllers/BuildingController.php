<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreBuildingRequest;
use App\Http\Requests\UpdateBuildingRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class BuildingController extends Controller
{
    /**
     * Create a new building within a project.
     */
    public function store(StoreBuildingRequest $request, string $current_team, string $project): RedirectResponse
    {
        $projectModel = $request->user()->currentTeam
            ->projects()
            ->where('slug', $project)
            ->firstOrFail();

        $projectModel->buildings()->create([
            'name' => $request->string('name')->toString(),
            'latitude' => $request->filled('latitude') ? $request->float('latitude') : null,
            'longitude' => $request->filled('longitude') ? $request->float('longitude') : null,
            'altitude' => $request->float('altitude', 0) ?: null,
            'address_label' => $request->string('address_label')->toString() ?: null,
            'rotation_x' => (float) $request->input('rotation.0', 0),
            'rotation_y' => (float) $request->input('rotation.1', 0),
            'rotation_z' => (float) $request->input('rotation.2', 0),
            'created_by' => $request->user()->id,
        ]);

        return back();
    }

    /**
     * Update a building's metadata within a project.
     */
    public function update(UpdateBuildingRequest $request, string $current_team, string $project, string $building): RedirectResponse
    {
        $projectModel = $request->user()->currentTeam
            ->projects()
            ->where('slug', $project)
            ->firstOrFail();

        $buildingModel = $projectModel->buildings()
            ->where('slug', $building)
            ->firstOrFail();

        $buildingModel->fill([
            ...$request->safe()->only(['name', 'address_label', 'altitude', 'preferred_scheme_id']),
            'latitude' => $request->filled('latitude') ? $request->float('latitude') : $buildingModel->latitude,
            'longitude' => $request->filled('longitude') ? $request->float('longitude') : $buildingModel->longitude,
            'rotation_x' => $request->input('rotation.0', $buildingModel->rotation_x),
            'rotation_y' => $request->input('rotation.1', $buildingModel->rotation_y),
            'rotation_z' => $request->input('rotation.2', $buildingModel->rotation_z),
        ])->save();

        return back();
    }

    /**
     * Delete a building (and its schemes) from a project.
     */
    public function destroy(Request $request, string $current_team, string $project, string $building): RedirectResponse
    {
        $projectModel = $request->user()->currentTeam
            ->projects()
            ->where('slug', $project)
            ->firstOrFail();

        $projectModel->buildings()
            ->where('slug', $building)
            ->firstOrFail()
            ->delete();

        return back();
    }
}
