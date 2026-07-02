import SaveSchemeController from '@/actions/App/Http/Controllers/SaveSchemeController';
import type { FoundationSizingResult } from '@/lib/portal-frame';
import type { PortalFrameCarbon } from '@/lib/portal-frame/carbon/carbon';
import type { BuildingDraft } from '@/types/custom-building';
import type { FrameMember } from '@/types/portal-frame';
import type { ServerBuilding, ServerScheme } from '@/types/scene';

function csrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);

    return match ? decodeURIComponent(match[1]) : '';
}

export type SaveSchemeInput = {
    building: {
        id?: number;
        /** Required when creating a new building; omit to keep the saved name. */
        name?: string;
        addressLabel?: string | null;
    };
    scheme: {
        id?: number | null;
        name?: string | null;
    };
    draft: BuildingDraft;
    /**
     * Omit (or pass null) to leave the building's placement untouched — e.g.
     * for a scheme-only save, or a building that has no map location yet.
     */
    origin?: [lng: number, lat: number] | null;
    altitude?: number | null;
    carbon: PortalFrameCarbon;
    members: FrameMember[];
    foundationSizing: {
        left: FoundationSizingResult;
        right: FoundationSizingResult;
    };
};

export type SaveSchemeResponse = {
    building: ServerBuilding;
    scheme: ServerScheme;
};

/** Build the request body expected by SaveSchemeRequest. */
export function buildSaveSchemePayload(
    input: SaveSchemeInput,
): Record<string, unknown> {
    const { draft, origin, altitude, carbon, members, foundationSizing } =
        input;

    const foundationRow = (
        side: 'left' | 'right',
        result: FoundationSizingResult,
    ) => ({
        side,
        type: result.type,
        label: result.label,
        dimensions: result.dimensions,
        checks: result.checks,
        reinforcement: result.reinforcement ?? null,
        pileCap: result.pileCap ?? null,
        calculationLines: result.calculationLines,
    });

    return {
        building: {
            ...(input.building.id ? { id: input.building.id } : {}),
            ...(input.building.name !== undefined
                ? { name: input.building.name }
                : {}),
            ...(input.building.addressLabel !== undefined
                ? { addressLabel: input.building.addressLabel }
                : {}),
            // Placement keys are only sent when the building is placed on the
            // map, so an omitted placement leaves the saved location alone.
            ...(origin
                ? {
                      latitude: origin[1],
                      longitude: origin[0],
                      altitude: altitude ?? null,
                      rotation: draft.rotation,
                  }
                : {}),
        },
        scheme: {
            ...(input.scheme.id ? { id: input.scheme.id } : {}),
            name: input.scheme.name ?? null,
            ...draft.portalFrame,
        },
        carbon: {
            totalCarbonKg: carbon.totalCarbonKg,
            floorAreaM2: carbon.floorAreaM2,
            carbonIntensityKgM2: carbon.carbonIntensityKgM2,
            scorsBand: carbon.scorsBand,
            breakdown: carbon.breakdown,
        },
        members: members.map((member) => ({
            role: member.role,
            start: member.start,
            end: member.end,
            section: member.section,
            footing: member.footing ?? null,
            pile: member.pile ?? null,
        })),
        foundations: [
            foundationRow('left', foundationSizing.left),
            foundationRow('right', foundationSizing.right),
        ],
    };
}

/** Persist a building + scheme snapshot; returns the saved server records. */
export async function saveScheme(
    teamSlug: string,
    projectSlug: string,
    input: SaveSchemeInput,
): Promise<SaveSchemeResponse> {
    const { url } = SaveSchemeController({
        current_team: teamSlug,
        project: projectSlug,
    });

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': csrfToken(),
        },
        credentials: 'same-origin',
        body: JSON.stringify(buildSaveSchemePayload(input)),
    });

    if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
            message?: string;
        } | null;

        throw new Error(payload?.message ?? 'Could not save this building.');
    }

    return response.json() as Promise<SaveSchemeResponse>;
}
