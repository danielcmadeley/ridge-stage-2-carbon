<?php

namespace App\Models;

use Database\Factories\FoundationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $scheme_id
 * @property string $side
 * @property string $type
 * @property string|null $label
 * @property float $width_m
 * @property float $depth_m
 * @property float $height_m
 * @property array<int, mixed> $checks
 * @property array<string, mixed>|null $reinforcement
 * @property array<string, mixed>|null $pile_cap
 * @property array<int, mixed>|null $calculation_lines
 * @property-read Scheme $scheme
 */
#[Fillable([
    'scheme_id',
    'side',
    'type',
    'label',
    'width_m',
    'depth_m',
    'height_m',
    'checks',
    'reinforcement',
    'pile_cap',
    'calculation_lines',
])]
class Foundation extends Model
{
    /** @use HasFactory<FoundationFactory> */
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
            'checks' => 'array',
            'reinforcement' => 'array',
            'pile_cap' => 'array',
            'calculation_lines' => 'array',
            'width_m' => 'float',
            'depth_m' => 'float',
            'height_m' => 'float',
        ];
    }
}
