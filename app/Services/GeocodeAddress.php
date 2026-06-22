<?php

namespace App\Services;

use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;

class GeocodeAddress
{
    /**
     * @return Collection<int, array{label: string, lng: float, lat: float}>
     */
    public function search(string $query, int $limit = 5): Collection
    {
        try {
            $response = Http::withHeaders([
                'User-Agent' => config('app.name').' Geocoder',
            ])
                ->acceptJson()
                ->timeout(10)
                ->get('https://nominatim.openstreetmap.org/search', [
                    'q' => $query,
                    'format' => 'json',
                    'limit' => $limit,
                    'countrycodes' => 'gb',
                    'addressdetails' => 0,
                ])
                ->throw()
                ->json();
        } catch (RequestException) {
            return collect();
        }

        if (! is_array($response)) {
            return collect();
        }

        return collect($response)
            ->filter(fn (mixed $result): bool => is_array($result)
                && isset($result['lat'], $result['lon'], $result['display_name']))
            ->map(fn (array $result): array => [
                'label' => (string) $result['display_name'],
                'lng' => (float) $result['lon'],
                'lat' => (float) $result['lat'],
            ])
            ->values();
    }
}
