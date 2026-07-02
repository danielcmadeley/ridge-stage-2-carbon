import { update as updateBuilding } from '@/actions/App/Http/Controllers/BuildingController';
import type { BuildingRotation } from '@/types/custom-building';
import type { ServerBuilding } from '@/types/scene';

function csrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);

    return match ? decodeURIComponent(match[1]) : '';
}

export type SaveBuildingPlacementInput = {
    latitude: number | null;
    longitude: number | null;
    altitude?: number | null;
    addressLabel?: string | null;
    rotation?: BuildingRotation;
};

export type SaveBuildingPlacementResponse = {
    building: ServerBuilding;
};

/** Build the request body expected by UpdateBuildingRequest. */
export function buildSaveBuildingPlacementPayload(
    input: SaveBuildingPlacementInput,
): Record<string, unknown> {
    return {
        latitude: input.latitude,
        longitude: input.longitude,
        ...(input.altitude !== undefined ? { altitude: input.altitude } : {}),
        ...(input.addressLabel !== undefined
            ? { address_label: input.addressLabel }
            : {}),
        ...(input.rotation ? { rotation: input.rotation } : {}),
    };
}

/** Persist a building's map placement without touching its schemes. */
export async function saveBuildingPlacement(
    teamSlug: string,
    projectSlug: string,
    buildingSlug: string,
    input: SaveBuildingPlacementInput,
): Promise<SaveBuildingPlacementResponse> {
    const { url, method } = updateBuilding({
        current_team: teamSlug,
        project: projectSlug,
        building: buildingSlug,
    });

    const response = await fetch(url, {
        method,
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': csrfToken(),
        },
        credentials: 'same-origin',
        body: JSON.stringify(buildSaveBuildingPlacementPayload(input)),
    });

    if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
            message?: string;
        } | null;

        throw new Error(
            payload?.message ?? 'Could not save this building location.',
        );
    }

    return response.json() as Promise<SaveBuildingPlacementResponse>;
}
