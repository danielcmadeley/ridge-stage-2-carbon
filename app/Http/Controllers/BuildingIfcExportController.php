<?php

namespace App\Http\Controllers;

use App\Http\Requests\ExportBuildingIfcRequest;
use App\Services\ExportBuildingIfc;
use Symfony\Component\HttpFoundation\Response;

class BuildingIfcExportController extends Controller
{
    public function __invoke(
        ExportBuildingIfcRequest $request,
        ExportBuildingIfc $exporter,
    ): Response {
        $payload = $request->exportPayload();
        $filename = sprintf(
            'building-%sx%sx%s.ifc',
            rtrim(rtrim((string) $payload['width'], '0'), '.'),
            rtrim(rtrim((string) $payload['depth'], '0'), '.'),
            rtrim(rtrim((string) $payload['height'], '0'), '.'),
        );

        return response($exporter->export($payload), 200, [
            'Content-Type' => 'application/x-step',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }
}
