<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ExportBuildingIfcRequest extends FormRequest
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
            'span' => ['required', 'numeric', 'min:1', 'max:1000'],
            'eavesHeight' => ['required', 'numeric', 'min:1', 'max:1000'],
            'buildingLength' => ['required', 'numeric', 'min:1', 'max:1000'],
            'baySpacing' => ['required', 'numeric', 'min:0.1', 'max:1000'],
            'deadLoadKnM2' => ['required', 'numeric', 'min:0', 'max:1000'],
            'liveLoadKnM2' => ['required', 'numeric', 'min:0', 'max:1000'],
            'columnRestraint' => ['required', 'string', Rule::in(['restrained', 'unrestrained'])],
            'roofPitchDeg' => ['nullable', 'numeric', 'min:0', 'max:45'],
            'name' => ['nullable', 'string', 'max:255'],
            'rotation' => ['nullable', 'array', 'size:3'],
            'rotation.0' => ['numeric'],
            'rotation.1' => ['numeric'],
            'rotation.2' => ['numeric'],
        ];
    }

    /**
     * @return array{
     *     span: float,
     *     eavesHeight: float,
     *     buildingLength: float,
     *     baySpacing: float,
     *     deadLoadKnM2: float,
     *     liveLoadKnM2: float,
     *     columnRestraint: 'restrained'|'unrestrained',
     *     roofPitchDeg: float,
     *     name: string|null,
     *     rotation: array{0: float, 1: float, 2: float}
     * }
     */
    public function exportPayload(): array
    {
        $validated = $this->validated();

        return [
            'span' => (float) $validated['span'],
            'eavesHeight' => (float) $validated['eavesHeight'],
            'buildingLength' => (float) $validated['buildingLength'],
            'baySpacing' => (float) $validated['baySpacing'],
            'deadLoadKnM2' => (float) $validated['deadLoadKnM2'],
            'liveLoadKnM2' => (float) $validated['liveLoadKnM2'],
            'columnRestraint' => $validated['columnRestraint'],
            'roofPitchDeg' => (float) ($validated['roofPitchDeg'] ?? 6.0),
            'name' => $validated['name'] ?? null,
            'rotation' => array_map(
                floatval(...),
                $validated['rotation'] ?? [0, 0, 0],
            ),
        ];
    }
}
