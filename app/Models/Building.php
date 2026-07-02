<?php

namespace App\Models;

use App\Concerns\GeneratesUniqueSlug;
use Database\Factories\BuildingFactory;
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
 * @property int $project_id
 * @property int|null $created_by
 * @property string $name
 * @property string $slug
 * @property float|null $latitude
 * @property float|null $longitude
 * @property float|null $altitude
 * @property string|null $address_label
 * @property float $rotation_x
 * @property float $rotation_y
 * @property float $rotation_z
 * @property int|null $preferred_scheme_id
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 * @property-read Project $project
 * @property-read User|null $creator
 * @property-read Collection<int, Scheme> $schemes
 * @property-read Scheme|null $preferredScheme
 */
#[Fillable([
    'project_id',
    'created_by',
    'name',
    'slug',
    'latitude',
    'longitude',
    'altitude',
    'address_label',
    'rotation_x',
    'rotation_y',
    'rotation_z',
    'preferred_scheme_id',
])]
class Building extends Model
{
    /** @use HasFactory<BuildingFactory> */
    use GeneratesUniqueSlug, HasFactory, SoftDeletes;

    protected static function slugScopeColumn(): ?string
    {
        return 'project_id';
    }

    /**
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return HasMany<Scheme, $this>
     */
    public function schemes(): HasMany
    {
        return $this->hasMany(Scheme::class);
    }

    /**
     * @return BelongsTo<Scheme, $this>
     */
    public function preferredScheme(): BelongsTo
    {
        return $this->belongsTo(Scheme::class, 'preferred_scheme_id');
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'latitude' => 'float',
            'longitude' => 'float',
            'altitude' => 'float',
            'rotation_x' => 'float',
            'rotation_y' => 'float',
            'rotation_z' => 'float',
        ];
    }
}
