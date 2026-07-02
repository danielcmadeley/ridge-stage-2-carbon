<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProjectRequest;
use App\Http\Resources\ProjectResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    /**
     * Create a new project for the current team.
     */
    public function store(StoreProjectRequest $request, string $current_team): RedirectResponse|JsonResponse
    {
        $project = $request->user()->currentTeam->projects()->create([
            ...$request->validated(),
            'created_by' => $request->user()->id,
        ]);

        // The onboarding flow creates a project via fetch and needs its slug back.
        if ($request->expectsJson()) {
            return response()->json(new ProjectResource($project), 201);
        }

        return redirect()->route('dashboard', ['current_team' => $current_team]);
    }

    /**
     * Delete a project.
     */
    public function destroy(Request $request, string $current_team, string $project): RedirectResponse
    {
        $projectModel = $request->user()->currentTeam
            ->projects()
            ->where('slug', $project)
            ->firstOrFail();

        $projectModel->delete();

        return back();
    }
}
