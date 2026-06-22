<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ExportBuildingIfcRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'width' => ['required', 'numeric', 'min:0.1', 'max:1000'],
            'depth' => ['required', 'numeric', 'min:0.1', 'max:1000'],
            'height' => ['required', 'numeric', 'min:0.1', 'max:1000'],
            'name' => ['nullable', 'string', 'max:255'],
            'rotation' => ['nullable', 'array', 'size:3'],
            'rotation.0' => ['numeric'],
            'rotation.1' => ['numeric'],
            'rotation.2' => ['numeric'],
        ];
    }

    /**
     * @return array{
     *     width: float,
     *     depth: float,
     *     height: float,
     *     name: string|null,
     *     rotation: array{0: float, 1: float, 2: float}
     * }
     */
    public function exportPayload(): array
    {
        $validated = $this->validated();

        return [
            'width' => (float) $validated['width'],
            'depth' => (float) $validated['depth'],
            'height' => (float) $validated['height'],
            'name' => $validated['name'] ?? null,
            'rotation' => array_map(
                floatval(...),
                $validated['rotation'] ?? [0, 0, 0],
            ),
        ];
    }
}
