<?php

namespace App\Http\Requests;

use App\Enums\SchemeStatus;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\Rule;

class SaveSchemeRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Team membership is enforced by the EnsureTeamMembership middleware, and
        // building/scheme ownership is checked in the SaveScheme action.
        return true;
    }

    /**
     * This endpoint is always called via fetch/JSON, so respond with JSON
     * validation errors even though it lives on a web (non-api) route.
     */
    protected function failedValidation(Validator $validator): never
    {
        throw new HttpResponseException(response()->json([
            'message' => 'The given data was invalid.',
            'errors' => $validator->errors(),
        ], 422));
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            // Building (placement) — id is present when re-saving an existing building.
            // Location and placement are optional: a building can be saved before it
            // is placed on the map, and a scheme-only save sends just the id.
            'building.id' => ['nullable', 'integer'],
            'building.name' => ['required_without:building.id', 'nullable', 'string', 'max:255'],
            'building.latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'building.longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'building.altitude' => ['nullable', 'numeric'],
            'building.addressLabel' => ['nullable', 'string', 'max:1000'],
            'building.rotation' => ['nullable', 'array', 'size:3'],
            'building.rotation.*' => ['numeric'],

            // Scheme (design inputs) — id is present when re-saving an existing scheme.
            'scheme.id' => ['nullable', 'integer'],
            'scheme.name' => ['nullable', 'string', 'max:255'],
            'scheme.status' => ['nullable', 'string', Rule::enum(SchemeStatus::class)],
            'scheme.span' => ['required', 'numeric', 'min:1', 'max:1000'],
            'scheme.eavesHeight' => ['required', 'numeric', 'min:1', 'max:1000'],
            'scheme.buildingLength' => ['required', 'numeric', 'min:1', 'max:1000'],
            'scheme.baySpacing' => ['required', 'numeric', 'min:0.1', 'max:1000'],
            'scheme.deadLoadKnM2' => ['required', 'numeric', 'min:0', 'max:1000'],
            'scheme.servicesLoadKnM2' => ['required', 'numeric', 'min:0', 'max:1000'],
            'scheme.liveLoadKnM2' => ['required', 'numeric', 'min:0', 'max:1000'],
            'scheme.columnRestraint' => ['required', 'string', Rule::in(['restrained', 'unrestrained'])],
            'scheme.roofPitchDeg' => ['nullable', 'numeric', 'min:0', 'max:45'],
            'scheme.foundation.type' => ['required', 'string', Rule::in(['two_pile_cap', 'reinforced_pad', 'mass_filled'])],
            'scheme.foundation.assumptions' => ['required', 'array'],
            'scheme.foundation.assumptions.*' => ['numeric'],

            // Frontend-computed carbon result.
            'carbon.totalCarbonKg' => ['required', 'numeric'],
            'carbon.floorAreaM2' => ['required', 'numeric'],
            'carbon.carbonIntensityKgM2' => ['required', 'numeric'],
            'carbon.scorsBand' => ['required', 'string', 'max:4'],
            'carbon.breakdown' => ['required', 'array'],
            'carbon.breakdown.*.massKg' => ['required', 'numeric'],
            'carbon.breakdown.*.carbonKg' => ['required', 'numeric'],

            // Frontend-computed frame geometry snapshot.
            'members' => ['required', 'array', 'min:1'],
            'members.*.role' => ['required', 'string', 'max:64'],
            'members.*.start' => ['required', 'array', 'size:3'],
            'members.*.start.*' => ['numeric'],
            'members.*.end' => ['required', 'array', 'size:3'],
            'members.*.end.*' => ['numeric'],
            'members.*.section' => ['required', 'array'],
            'members.*.section.name' => ['required', 'string', 'max:128'],
            'members.*.section.profile' => ['required', 'string', 'max:16'],
            'members.*.section.massPerMKg' => ['required', 'numeric'],
            'members.*.footing' => ['nullable', 'array'],
            'members.*.pile' => ['nullable', 'array'],

            // Frontend-computed foundation sizing snapshot (left/right).
            'foundations' => ['required', 'array', 'min:1'],
            'foundations.*.side' => ['required', 'string', Rule::in(['left', 'right'])],
            'foundations.*.type' => ['required', 'string', 'max:64'],
            'foundations.*.label' => ['nullable', 'string', 'max:128'],
            'foundations.*.dimensions.widthM' => ['required', 'numeric'],
            'foundations.*.dimensions.depthM' => ['required', 'numeric'],
            'foundations.*.dimensions.heightM' => ['required', 'numeric'],
            'foundations.*.checks' => ['nullable', 'array'],
            'foundations.*.reinforcement' => ['nullable', 'array'],
            'foundations.*.pileCap' => ['nullable', 'array'],
            'foundations.*.calculationLines' => ['nullable', 'array'],
        ];
    }
}
