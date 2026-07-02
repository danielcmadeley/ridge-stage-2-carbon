<?php

namespace App\Models;

use App\Concerns\GeneratesUniqueSlug;
use Database\Factories\ProjectFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $team_id
 * @property int|null $created_by
 * @property string $name
 * @property string $slug
 * @property string|null $client
 * @property string|null $project_number
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 * @property-read Team $team
 * @property-read User|null $creator
 * @property-read Collection<int, Building> $buildings
 */
#[Fillable(['team_id', 'created_by', 'name', 'slug', 'client', 'project_number'])]
class Project extends Model
{
    /** @use HasFactory<ProjectFactory> */
    use GeneratesUniqueSlug, HasFactory, SoftDeletes;

    protected static function slugScopeColumn(): ?string
    {
        return 'team_id';
    }

    /**
     * @return BelongsTo<Team, $this>
     */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return HasMany<Building, $this>
     */
    public function buildings(): HasMany
    {
        return $this->hasMany(Building::class);
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }
}
