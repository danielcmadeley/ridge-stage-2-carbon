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
            'servicesLoadKnM2' => ['nullable', 'numeric', 'min:0', 'max:1000'],
            'liveLoadKnM2' => ['required', 'numeric', 'min:0', 'max:1000'],
            'columnRestraint' => ['required', 'string', Rule::in(['restrained', 'unrestrained'])],
            'roofPitchDeg' => ['nullable', 'numeric', 'min:0', 'max:45'],
            'foundation' => ['nullable', 'array'],
            'foundation.type' => ['nullable', 'string', Rule::in(['two_pile_cap', 'reinforced_pad', 'mass_filled'])],
            'foundation.assumptions' => ['nullable', 'array'],
            'foundation.assumptions.allowableBearingKpa' => ['nullable', 'numeric', 'min:1', 'max:10000'],
            'foundation.assumptions.pileWorkingCapacityKn' => ['nullable', 'numeric', 'min:1', 'max:10000'],
            'foundation.assumptions.pileDiameterM' => ['nullable', 'numeric', 'min:0.1', 'max:5'],
            'foundation.assumptions.pileSpacingFactor' => ['nullable', 'numeric', 'min:1', 'max:20'],
            'foundation.assumptions.concreteDensityKnM3' => ['nullable', 'numeric', 'min:1', 'max:100'],
            'foundation.assumptions.soilCoverDensityKnM3' => ['nullable', 'numeric', 'min:1', 'max:100'],
            'foundation.assumptions.frictionCoefficient' => ['nullable', 'numeric', 'min:0.01', 'max:2'],
            'foundation.assumptions.concreteCoverM' => ['nullable', 'numeric', 'min:0.001', 'max:1'],
            'foundation.assumptions.reinforcementYieldStrengthMpa' => ['nullable', 'numeric', 'min:1', 'max:2000'],
            'foundation.assumptions.preferredBarDiameterMm' => ['nullable', 'numeric', 'min:1', 'max:100'],
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
     *     servicesLoadKnM2: float,
     *     liveLoadKnM2: float,
     *     columnRestraint: 'restrained'|'unrestrained',
     *     roofPitchDeg: float,
     *     foundation: array{type: string, assumptions: array<string, float>},
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
            'servicesLoadKnM2' => (float) ($validated['servicesLoadKnM2'] ?? 0),
            'liveLoadKnM2' => (float) $validated['liveLoadKnM2'],
            'columnRestraint' => $validated['columnRestraint'],
            'roofPitchDeg' => (float) ($validated['roofPitchDeg'] ?? 6.0),
            'foundation' => [
                'type' => (string) data_get($validated, 'foundation.type', 'reinforced_pad'),
                'assumptions' => array_map(
                    floatval(...),
                    data_get($validated, 'foundation.assumptions', []),
                ),
            ],
            'name' => $validated['name'] ?? null,
            'rotation' => array_map(
                floatval(...),
                $validated['rotation'] ?? [0, 0, 0],
            ),
        ];
    }
}
