<?php

namespace App\Http\Resources;

use App\Models\Scheme;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Scheme
 */
class SchemeResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'status' => $this->status->value,
            'design' => $this->toDesignArray(),
            'carbon' => [
                'totalCarbonKg' => $this->total_carbon_kg,
                'totalSteelKg' => $this->total_steel_kg,
                'floorAreaM2' => $this->floor_area_m2,
                'carbonIntensityKgM2' => $this->carbon_intensity_kg_m2,
                'scorsBand' => $this->scors_band,
            ],
        ];
    }
}
