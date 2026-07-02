<?php

namespace App\Http\Controllers;

use App\Http\Resources\ProjectResource;
use App\Models\TeamInvitation;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SceneController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $email = strtolower($request->user()->email);

        $buildingSlug = $request->query('building');
        $schemeId = $request->query('scheme');

        $projectsQuery = $request->user()->currentTeam
            ->projects()
            ->latest();

        $schemesVerifiedFirst = fn ($query) => $query->verifiedFirst();

        if ($buildingSlug) {
            $projectsQuery
                ->whereHas('buildings', fn ($query) => $query->where('slug', $buildingSlug))
                ->with(['buildings' => fn ($query) => $query
                    ->where('slug', $buildingSlug)
                    ->with(['schemes' => $schemesVerifiedFirst])]);
        } else {
            $projectsQuery->with(['buildings.schemes' => $schemesVerifiedFirst]);
        }

        $projects = $projectsQuery->get();

        $pendingInvitations = TeamInvitation::query()
            ->with(['inviter', 'team'])
            ->whereRaw('LOWER(email) = ?', [$email])
            ->whereNull('accepted_at')
            ->where(fn ($query) => $query
                ->whereNull('expires_at')
                ->orWhere('expires_at', '>=', now()))
            ->latest()
            ->get()
            ->map(fn (TeamInvitation $invitation) => [
                'code' => $invitation->code,
                'inviterName' => $invitation->inviter->name,
                'team' => [
                    'name' => $invitation->team->name,
                    'slug' => $invitation->team->slug,
                ],
            ]);

        return Inertia::render('Scene', [
            'projects' => ProjectResource::collection($projects),
            'pendingInvitations' => $pendingInvitations,
            'focusBuildingSlug' => $buildingSlug,
            'focusSchemeId' => $schemeId ? (int) $schemeId : null,
        ]);
    }
}
