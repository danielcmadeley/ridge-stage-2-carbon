<?php

namespace App\Actions\Schemes;

use App\Enums\SchemeStatus;
use App\Models\Building;
use App\Models\Project;
use App\Models\Scheme;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class SaveScheme
{
    /**
     * Steel breakdown elements counted towards the total steel mass rollup.
     */
    private const STEEL_ELEMENTS = [
        'columns', 'gableColumns', 'rafters', 'haunches',
        'ties', 'braces', 'sideRails', 'purlins', 'connections',
    ];

    /**
     * Persist a building, its scheme, and the frontend-computed snapshot.
     *
     * @param  array<string, mixed>  $payload  Validated SaveSchemeRequest data.
     */
    public function handle(User $user, Project $project, array $payload): Scheme
    {
        return DB::transaction(function () use ($user, $project, $payload) {
            $building = $this->upsertBuilding($user, $project, $payload['building']);
            $scheme = $this->upsertScheme($user, $building, $payload);

            $this->replaceFrameMembers($scheme, $payload['members']);
            $this->replaceFoundations($scheme, $payload['foundations']);
            $this->replaceCarbonData($scheme, $payload['carbon']['breakdown']);

            $building->preferred_scheme_id = $scheme->id;
            $building->save();

            return $scheme->load(['building.schemes', 'frameMembers', 'foundations', 'carbonData']);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function upsertBuilding(User $user, Project $project, array $data): Building
    {
        $building = isset($data['id'])
            ? $project->buildings()->findOrFail((int) $data['id'])
            : $project->buildings()->make(['created_by' => $user->id]);

        // Only overwrite the attributes the payload actually carries so a
        // scheme-only save (just the id) leaves the building untouched.
        $building->fill([
            ...(array_key_exists('name', $data) && $data['name'] !== null ? ['name' => $data['name']] : []),
            ...(array_key_exists('latitude', $data) ? ['latitude' => $data['latitude']] : []),
            ...(array_key_exists('longitude', $data) ? ['longitude' => $data['longitude']] : []),
            ...(array_key_exists('altitude', $data) ? ['altitude' => $data['altitude']] : []),
            ...(array_key_exists('addressLabel', $data) ? ['address_label' => $data['addressLabel']] : []),
            ...(isset($data['rotation']) ? [
                'rotation_x' => $data['rotation'][0],
                'rotation_y' => $data['rotation'][1],
                'rotation_z' => $data['rotation'][2],
            ] : []),
        ]);
        $building->save();

        return $building;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function upsertScheme(User $user, Building $building, array $payload): Scheme
    {
        $design = $payload['scheme'];
        $carbon = $payload['carbon'];

        $scheme = isset($design['id'])
            ? $building->schemes()->findOrFail((int) $design['id'])
            : $building->schemes()->make([
                'created_by' => $user->id,
                'status' => SchemeStatus::Draft,
            ]);

        $scheme->fill([
            // Keep the current name/status on re-save unless explicitly changed.
            'name' => $design['name'] ?? $scheme->name,
            'status' => $design['status'] ?? $scheme->status->value,
            'calculated_by' => $user->id,
            'span' => $design['span'],
            'eaves_height' => $design['eavesHeight'],
            'building_length' => $design['buildingLength'],
            'bay_spacing' => $design['baySpacing'],
            'dead_load_kn_m2' => $design['deadLoadKnM2'],
            'services_load_kn_m2' => $design['servicesLoadKnM2'],
            'live_load_kn_m2' => $design['liveLoadKnM2'],
            'column_restraint' => $design['columnRestraint'],
            'roof_pitch_deg' => $design['roofPitchDeg'] ?? 6.0,
            'foundation_type' => $design['foundation']['type'],
            'foundation_assumptions' => $design['foundation']['assumptions'],
            'total_steel_kg' => $this->totalSteelKg($carbon['breakdown']),
            'total_carbon_kg' => $carbon['totalCarbonKg'],
            'carbon_intensity_kg_m2' => $carbon['carbonIntensityKgM2'],
            'floor_area_m2' => $carbon['floorAreaM2'],
            'scors_band' => $carbon['scorsBand'],
        ]);
        $scheme->save();

        return $scheme;
    }

    /**
     * @param  array<int, array<string, mixed>>  $members
     */
    private function replaceFrameMembers(Scheme $scheme, array $members): void
    {
        $scheme->frameMembers()->delete();

        $rows = array_map(function (array $member): array {
            $lengthM = $this->distance($member['start'], $member['end']);
            $massPerM = (float) ($member['section']['massPerMKg'] ?? 0);

            return [
                'role' => $member['role'],
                'start_x' => $member['start'][0],
                'start_y' => $member['start'][1],
                'start_z' => $member['start'][2],
                'end_x' => $member['end'][0],
                'end_y' => $member['end'][1],
                'end_z' => $member['end'][2],
                'section_profile' => $member['section']['profile'],
                'section_name' => $member['section']['name'],
                'section' => $member['section'],
                'length_m' => round($lengthM, 4),
                'mass_kg' => round($lengthM * $massPerM, 4),
                'footing' => $member['footing'] ?? null,
                'pile' => $member['pile'] ?? null,
            ];
        }, $members);

        $scheme->frameMembers()->createMany($rows);
    }

    /**
     * @param  array<int, array<string, mixed>>  $foundations
     */
    private function replaceFoundations(Scheme $scheme, array $foundations): void
    {
        $scheme->foundations()->delete();

        $rows = array_map(fn (array $foundation): array => [
            'side' => $foundation['side'],
            'type' => $foundation['type'],
            'label' => $foundation['label'] ?? null,
            'width_m' => $foundation['dimensions']['widthM'],
            'depth_m' => $foundation['dimensions']['depthM'],
            'height_m' => $foundation['dimensions']['heightM'],
            'checks' => $foundation['checks'] ?? [],
            'reinforcement' => $foundation['reinforcement'] ?? null,
            'pile_cap' => $foundation['pileCap'] ?? null,
            'calculation_lines' => $foundation['calculationLines'] ?? [],
        ], $foundations);

        $scheme->foundations()->createMany($rows);
    }

    /**
     * @param  array<string, array{massKg: float, carbonKg: float}>  $breakdown
     */
    private function replaceCarbonData(Scheme $scheme, array $breakdown): void
    {
        $scheme->carbonData()->delete();

        $rows = [];
        foreach ($breakdown as $element => $quantity) {
            $rows[] = [
                'element' => $element,
                'mass_kg' => $quantity['massKg'],
                'carbon_kg' => $quantity['carbonKg'],
            ];
        }

        $scheme->carbonData()->createMany($rows);
    }

    /**
     * @param  array<string, array{massKg: float, carbonKg: float}>  $breakdown
     */
    private function totalSteelKg(array $breakdown): float
    {
        $total = 0.0;

        foreach (self::STEEL_ELEMENTS as $element) {
            $total += (float) ($breakdown[$element]['massKg'] ?? 0);
        }

        return round($total, 4);
    }

    /**
     * @param  array<int, float|int>  $start
     * @param  array<int, float|int>  $end
     */
    private function distance(array $start, array $end): float
    {
        return sqrt(
            (($end[0] - $start[0]) ** 2)
            + (($end[1] - $start[1]) ** 2)
            + (($end[2] - $start[2]) ** 2)
        );
    }
}
