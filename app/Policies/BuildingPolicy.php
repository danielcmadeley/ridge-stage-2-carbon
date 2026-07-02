<?php

namespace App\Policies;

use App\Models\Building;
use App\Models\User;

class BuildingPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Building $building): bool
    {
        return $user->belongsToTeam($building->project->team);
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Building $building): bool
    {
        return $user->belongsToTeam($building->project->team);
    }

    public function delete(User $user, Building $building): bool
    {
        return $user->belongsToTeam($building->project->team);
    }
}
