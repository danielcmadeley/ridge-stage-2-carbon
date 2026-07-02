<?php

namespace App\Models;

use Database\Factories\FrameMemberFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $scheme_id
 * @property string $role
 * @property float $start_x
 * @property float $start_y
 * @property float $start_z
 * @property float $end_x
 * @property float $end_y
 * @property float $end_z
 * @property string $section_profile
 * @property string $section_name
 * @property array<string, mixed> $section
 * @property float $length_m
 * @property float $mass_kg
 * @property array<string, mixed>|null $footing
 * @property array<string, mixed>|null $pile
 * @property-read Scheme $scheme
 */
#[Fillable([
    'scheme_id',
    'role',
    'start_x',
    'start_y',
    'start_z',
    'end_x',
    'end_y',
    'end_z',
    'section_profile',
    'section_name',
    'section',
    'length_m',
    'mass_kg',
    'footing',
    'pile',
])]
class FrameMember extends Model
{
    /** @use HasFactory<FrameMemberFactory> */
    use HasFactory;

    /**
     * @return BelongsTo<Scheme, $this>
     */
    public function scheme(): BelongsTo
    {
        return $this->belongsTo(Scheme::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'section' => 'array',
            'footing' => 'array',
            'pile' => 'array',
            'start_x' => 'float',
            'start_y' => 'float',
            'start_z' => 'float',
            'end_x' => 'float',
            'end_y' => 'float',
            'end_z' => 'float',
            'length_m' => 'float',
            'mass_kg' => 'float',
        ];
    }
}
