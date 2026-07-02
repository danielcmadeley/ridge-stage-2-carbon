<?php

namespace App\Http\Resources;

use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Project
 */
class ProjectResource extends JsonResource
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
            'client' => $this->client,
            'projectNumber' => $this->project_number,
            'buildingsCount' => $this->whenCounted('buildings'),
            'buildings' => BuildingResource::collection($this->whenLoaded('buildings')),
        ];
    }
}
