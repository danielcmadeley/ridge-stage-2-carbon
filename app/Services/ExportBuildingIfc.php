<?php

namespace App\Services;

use App\Data\PortalFrameDesign;
use App\Services\PortalFrame\PortalFrameDesignResolver;
use Illuminate\Support\Facades\Process;
use RuntimeException;

class ExportBuildingIfc
{
    private const GROUND_FLOOR_SLAB_DEPTH_M = 0.25;

    public function __construct(
        private readonly PortalFrameDesignResolver $portalFrameDesignResolver,
    ) {}

    /**
     * @param  array{
     *     span: float|int,
     *     eavesHeight: float|int,
     *     buildingLength: float|int,
     *     baySpacing: float|int,
     *     deadLoadKnM2: float|int,
     *     liveLoadKnM2: float|int,
     *     columnRestraint: 'restrained'|'unrestrained',
     *     roofPitchDeg?: float|int,
     *     foundation?: array{type?: string, assumptions?: array<string, float|int>},
     *     name?: string|null,
     *     rotation?: array{0: float|int, 1: float|int, 2: float|int}
     * }  $payload
     */
    public function export(array $payload): string
    {
        $temporaryPath = tempnam(sys_get_temp_dir(), 'ridge-ifc-');

        if ($temporaryPath === false) {
            throw new RuntimeException('Could not create a temporary IFC file.');
        }

        $outputPath = $temporaryPath.'.ifc';
        rename($temporaryPath, $outputPath);

        $design = PortalFrameDesign::fromArray($payload);
        $resolved = $this->portalFrameDesignResolver->resolveForExport($design);

        $process = Process::timeout(30)
            ->input(json_encode([
                'name' => $payload['name'] ?? null,
                'rotation' => $payload['rotation'] ?? [0, 0, 0],
                'members' => $resolved['members'],
                'haunches' => $resolved['haunches'],
                'slab' => [
                    'id' => 'ground-floor-slab',
                    'width' => $design->span,
                    'length' => $design->buildingLength,
                    'depth' => self::GROUND_FLOOR_SLAB_DEPTH_M,
                ],
            ], JSON_THROW_ON_ERROR))
            ->run([
                config('services.ifc.python_binary'),
                base_path('scripts/export_building_ifc.py'),
                $outputPath,
            ]);

        if (! $process->successful()) {
            @unlink($outputPath);

            throw new RuntimeException(trim($process->errorOutput()) ?: 'IfcOpenShell export failed.');
        }

        $contents = file_get_contents($outputPath);

        @unlink($outputPath);

        if ($contents === false || $contents === '') {
            throw new RuntimeException('IfcOpenShell produced an empty IFC file.');
        }

        return $contents;
    }
}
