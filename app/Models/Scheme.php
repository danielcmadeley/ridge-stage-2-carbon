<?php

namespace App\Models;

use App\Data\PortalFrameDesign;
use App\Enums\SchemeStatus;
use Database\Factories\SchemeFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $building_id
 * @property int|null $created_by
 * @property int|null $calculated_by
 * @property int|null $verified_by
 * @property SchemeStatus $status
 * @property string|null $name
 * @property float $span
 * @property float $eaves_height
 * @property float $building_length
 * @property float $bay_spacing
 * @property float $dead_load_kn_m2
 * @property float $services_load_kn_m2
 * @property float $live_load_kn_m2
 * @property string $column_restraint
 * @property float $roof_pitch_deg
 * @property string $foundation_type
 * @property array<string, float|int> $foundation_assumptions
 * @property float|null $total_steel_kg
 * @property float|null $total_carbon_kg
 * @property float|null $carbon_intensity_kg_m2
 * @property float|null $floor_area_m2
 * @property string|null $scors_band
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 * @property-read Building $building
 * @property-read Collection<int, FrameMember> $frameMembers
 * @property-read Collection<int, Foundation> $foundations
 * @property-read Collection<int, CarbonDatum> $carbonData
 */
#[Fillable([
    'building_id',
    'created_by',
    'calculated_by',
    'verified_by',
    'status',
    'name',
    'span',
    'eaves_height',
    'building_length',
    'bay_spacing',
    'dead_load_kn_m2',
    'services_load_kn_m2',
    'live_load_kn_m2',
    'column_restraint',
    'roof_pitch_deg',
    'foundation_type',
    'foundation_assumptions',
    'total_steel_kg',
    'total_carbon_kg',
    'carbon_intensity_kg_m2',
    'floor_area_m2',
    'scors_band',
])]
class Scheme extends Model
{
    /** @use HasFactory<SchemeFactory> */
    use HasFactory, SoftDeletes;

    /**
     * @return BelongsTo<Building, $this>
     */
    public function building(): BelongsTo
    {
        return $this->belongsTo(Building::class);
    }

    /**
     * @return HasMany<FrameMember, $this>
     */
    public function frameMembers(): HasMany
    {
        return $this->hasMany(FrameMember::class);
    }

    /**
     * @return HasMany<Foundation, $this>
     */
    public function foundations(): HasMany
    {
        return $this->hasMany(Foundation::class);
    }

    /**
     * @return HasMany<CarbonDatum, $this>
     */
    public function carbonData(): HasMany
    {
        return $this->hasMany(CarbonDatum::class);
    }

    /**
     * Order the verified scheme first, then the rest newest-first.
     *
     * @param  Builder<Scheme>  $query
     */
    #[Scope]
    protected function verifiedFirst(Builder $query): void
    {
        $query
            ->orderByRaw('case when status = ? then 0 else 1 end', [SchemeStatus::Verified->value])
            ->latest();
    }

    /**
     * Build the design DTO from the persisted columns.
     */
    public function toDesign(): PortalFrameDesign
    {
        return new PortalFrameDesign(
            span: (float) $this->span,
            eavesHeight: (float) $this->eaves_height,
            buildingLength: (float) $this->building_length,
            baySpacing: (float) $this->bay_spacing,
            deadLoadKnM2: (float) $this->dead_load_kn_m2,
            servicesLoadKnM2: (float) $this->services_load_kn_m2,
            liveLoadKnM2: (float) $this->live_load_kn_m2,
            columnRestraint: $this->column_restraint,
            roofPitchDeg: (float) $this->roof_pitch_deg,
            foundationType: $this->foundation_type,
            foundationAssumptions: $this->foundation_assumptions,
        );
    }

    /**
     * The design in the shape the frontend PortalFrameDesign type expects.
     *
     * @return array<string, float|int|string|array<string, mixed>>
     */
    public function toDesignArray(): array
    {
        return $this->toDesign()->toArray();
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => SchemeStatus::class,
            'foundation_assumptions' => 'array',
            'span' => 'float',
            'eaves_height' => 'float',
            'building_length' => 'float',
            'bay_spacing' => 'float',
            'dead_load_kn_m2' => 'float',
            'services_load_kn_m2' => 'float',
            'live_load_kn_m2' => 'float',
            'roof_pitch_deg' => 'float',
            'total_steel_kg' => 'float',
            'total_carbon_kg' => 'float',
            'carbon_intensity_kg_m2' => 'float',
            'floor_area_m2' => 'float',
        ];
    }
}
