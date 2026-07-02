<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateBuildingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            // Name is optional so a placement-only PATCH (latitude/longitude)
            // can update the location without resending the building name.
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'altitude' => ['nullable', 'numeric'],
            'address_label' => ['nullable', 'string', 'max:1000'],
            'rotation' => ['nullable', 'array', 'size:3'],
            'rotation.*' => ['numeric'],
            'preferred_scheme_id' => ['nullable', 'integer', 'exists:schemes,id'],
        ];
    }
}
