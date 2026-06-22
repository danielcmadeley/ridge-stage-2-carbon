<?php

namespace App\Http\Controllers;

use App\Http\Requests\GeocodeAddressRequest;
use App\Services\GeocodeAddress;
use Illuminate\Http\JsonResponse;

class AddressGeocodeController extends Controller
{
    public function __invoke(GeocodeAddressRequest $request, GeocodeAddress $geocoder): JsonResponse
    {
        $results = $geocoder->search($request->validated('q'));

        return response()->json([
            'results' => $results,
        ]);
    }
}
