<?php

namespace App\Models;

use Database\Factories\CarbonDatumFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $scheme_id
 * @property string $element
 * @property float $mass_kg
 * @property float $carbon_kg
 * @property-read Scheme $scheme
 */
#[Fillable(['scheme_id', 'element', 'mass_kg', 'carbon_kg'])]
class CarbonDatum extends Model
{
    /** @use HasFactory<CarbonDatumFactory> */
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
            'mass_kg' => 'float',
            'carbon_kg' => 'float',
        ];
    }
}
