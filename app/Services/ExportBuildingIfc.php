<?php

namespace App\Services;

use Illuminate\Support\Facades\Process;
use RuntimeException;

class ExportBuildingIfc
{
    /**
     * @param  array{
     *     width: float|int,
     *     depth: float|int,
     *     height: float|int,
     *     name?: string|null,
     *     rotation?: array{0: float|int, 1: float|int, 2: float|int},
     *     origin?: array{0: float|int, 1: float|int}|null
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

        $process = Process::timeout(30)
            ->input(json_encode([
                'width' => $payload['width'],
                'depth' => $payload['depth'],
                'height' => $payload['height'],
                'name' => $payload['name'] ?? null,
                'rotation' => $payload['rotation'] ?? [0, 0, 0],
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
