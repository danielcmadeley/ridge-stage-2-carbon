<?php

namespace App\Http\Controllers;

use App\Actions\Schemes\SaveScheme;
use App\Http\Requests\SaveSchemeRequest;
use App\Http\Resources\BuildingResource;
use App\Http\Resources\SchemeResource;
use Illuminate\Http\JsonResponse;

class SaveSchemeController extends Controller
{
    /**
     * Persist a building and its scheme with the frontend-computed snapshot.
     */
    public function __invoke(SaveSchemeRequest $request, string $current_team, string $project, SaveScheme $saveScheme): JsonResponse
    {
        $user = $request->user();
        $projectModel = $user->currentTeam->projects()->where('slug', $project)->firstOrFail();

        $scheme = $saveScheme->handle($user, $projectModel, $request->validated());

        return response()->json([
            'building' => new BuildingResource($scheme->building),
            'scheme' => new SchemeResource($scheme),
        ]);
    }
}
