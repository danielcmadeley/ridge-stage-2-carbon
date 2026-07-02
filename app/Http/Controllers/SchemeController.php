<?php

namespace App\Http\Controllers;

use App\Data\PortalFrameDesign;
use App\Enums\SchemeStatus;
use App\Http\Requests\StoreSchemeRequest;
use App\Http\Requests\UpdateSchemeRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class SchemeController extends Controller
{
    /**
     * Create a new draft scheme for a building using the default design.
     */
    public function store(StoreSchemeRequest $request, string $current_team, string $project, string $building): RedirectResponse
    {
        $projectModel = $request->user()->currentTeam
            ->projects()
            ->where('slug', $project)
            ->firstOrFail();

        $buildingModel = $projectModel->buildings()
            ->where('slug', $building)
            ->firstOrFail();

        $design = PortalFrameDesign::defaults();

        $buildingModel->schemes()->create([
            'created_by' => $request->user()->id,
            'status' => SchemeStatus::Draft,
            'name' => $request->string('name')->toString() ?: null,
            'span' => $design->span,
            'eaves_height' => $design->eavesHeight,
            'building_length' => $design->buildingLength,
            'bay_spacing' => $design->baySpacing,
            'dead_load_kn_m2' => $design->deadLoadKnM2,
            'services_load_kn_m2' => $design->servicesLoadKnM2,
            'live_load_kn_m2' => $design->liveLoadKnM2,
            'column_restraint' => $design->columnRestraint,
            'roof_pitch_deg' => $design->roofPitchDeg,
            'foundation_type' => $design->foundationType,
            'foundation_assumptions' => $design->foundationAssumptions,
        ]);

        return back();
    }

    /**
     * Rename a scheme or toggle it between draft and verified. Only one scheme
     * per building can be verified at a time.
     */
    public function update(UpdateSchemeRequest $request, string $current_team, string $project, string $building, int $scheme): RedirectResponse
    {
        $projectModel = $request->user()->currentTeam
            ->projects()
            ->where('slug', $project)
            ->firstOrFail();

        $buildingModel = $projectModel->buildings()
            ->where('slug', $building)
            ->firstOrFail();

        $schemeModel = $buildingModel->schemes()
            ->whereKey($scheme)
            ->firstOrFail();

        $validated = $request->validated();

        if (array_key_exists('status', $validated)) {
            if ($validated['status'] === SchemeStatus::Verified->value) {
                $buildingModel->schemes()
                    ->whereKeyNot($schemeModel->id)
                    ->where('status', SchemeStatus::Verified)
                    ->update(['status' => SchemeStatus::Draft, 'verified_by' => null]);

                $validated['verified_by'] = $request->user()->id;
            } else {
                $validated['verified_by'] = null;
            }
        }

        $schemeModel->update($validated);

        return back();
    }

    /**
     * Delete a scheme from a building, repointing the preferred scheme if needed.
     */
    public function destroy(Request $request, string $current_team, string $project, string $building, int $scheme): RedirectResponse
    {
        $projectModel = $request->user()->currentTeam
            ->projects()
            ->where('slug', $project)
            ->firstOrFail();

        $buildingModel = $projectModel->buildings()
            ->where('slug', $building)
            ->firstOrFail();

        $schemeModel = $buildingModel->schemes()->findOrFail($scheme);
        $schemeModel->delete();

        if ($buildingModel->preferred_scheme_id === $schemeModel->id) {
            $buildingModel->preferred_scheme_id = $buildingModel->schemes()->latest()->value('id');
            $buildingModel->save();
        }

        return back();
    }
}
