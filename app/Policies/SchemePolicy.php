<?php

namespace App\Policies;

use App\Models\Scheme;
use App\Models\User;

class SchemePolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Scheme $scheme): bool
    {
        return $user->belongsToTeam($scheme->building->project->team);
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Scheme $scheme): bool
    {
        return $user->belongsToTeam($scheme->building->project->team);
    }

    public function delete(User $user, Scheme $scheme): bool
    {
        return $user->belongsToTeam($scheme->building->project->team);
    }
}
