import type { Team } from '@/types';

export type GeocodedAddress = {
    label: string;
    lng: number;
    lat: number;
};

type GeocodeResponse = {
    results: GeocodedAddress[];
};

function csrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);

    return match ? decodeURIComponent(match[1]) : '';
}

export async function geocodeAddress(
    teamSlug: Team['slug'],
    query: string,
): Promise<GeocodedAddress[]> {
    const response = await fetch(`/${teamSlug}/geocode`, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': csrfToken(),
        },
        credentials: 'same-origin',
        body: JSON.stringify({ q: query }),
    });

    if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
            message?: string;
            errors?: { q?: string[] };
        } | null;

        throw new Error(
            payload?.errors?.q?.[0]
                ?? payload?.message
                ?? 'Could not search for that address.',
        );
    }

    const payload = (await response.json()) as GeocodeResponse;

    return payload.results;
}
