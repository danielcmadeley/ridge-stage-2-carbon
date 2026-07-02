<?php

namespace App\Http\Resources;

use App\Models\Building;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Building
 */
class BuildingResource extends JsonResource
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
            'slug' => $this->slug,
            // GeoJSON order: [longitude, latitude]. Null until placed on the map.
            'origin' => $this->longitude !== null && $this->latitude !== null
                ? [$this->longitude, $this->latitude]
                : null,
            'altitude' => $this->altitude,
            'rotation' => [$this->rotation_x, $this->rotation_y, $this->rotation_z],
            'addressLabel' => $this->address_label,
            'preferredSchemeId' => $this->preferred_scheme_id,
            'schemes' => SchemeResource::collection($this->whenLoaded('schemes')),
        ];
    }
}
