import {
    defaultPortalFrameDesign,
    normalizePortalFrameDesign,
} from '@/types/portal-frame';
import type { PortalFrameDesign } from '@/types/portal-frame';
import type { ServerBuilding } from '@/types/scene';

export type BuildingRotation = [x: number, y: number, z: number];

export type BuildingDraft = {
    portalFrame: PortalFrameDesign;
    rotation: BuildingRotation;
};

/** Server identifiers attached to a placed building once it has been saved. */
export type BuildingPersistence = {
    buildingId: number;
    buildingSlug: string;
    projectSlug: string;
    schemeId: number | null;
    name: string;
    addressLabel: string | null;
};

export type CustomBuilding = BuildingDraft & {
    id: string;
    /** Null when the building has not been placed on the map yet. */
    origin: [lng: number, lat: number] | null;
    altitude: number;
    /** Present when this building has been persisted to the database. */
    persisted?: BuildingPersistence;
};

/** A building with a map location, renderable on the map. */
export type PlacedCustomBuilding = CustomBuilding & {
    origin: [lng: number, lat: number];
};

export function isPlacedOnMap(
    building: CustomBuilding,
): building is PlacedCustomBuilding {
    return building.origin !== null;
}

export const defaultBuildingDraft = (): BuildingDraft => ({
    portalFrame: defaultPortalFrameDesign(),
    rotation: [0, 0, 0],
});

/**
 * Map a persisted building (with its preferred scheme) onto the in-memory
 * CustomBuilding shape the map renders.
 */
export function customBuildingFromServer(
    building: ServerBuilding,
    projectSlug: string,
    schemeId?: number | null,
): CustomBuilding {
    const activeScheme =
        (schemeId != null
            ? building.schemes.find((scheme) => scheme.id === schemeId)
            : null) ??
        building.schemes.find(
            (scheme) => scheme.id === building.preferredSchemeId,
        ) ??
        building.schemes[0];

    return {
        id: `server-${building.id}`,
        origin: building.origin,
        altitude: building.altitude ?? 0,
        rotation: building.rotation,
        portalFrame: normalizePortalFrameDesign(
            activeScheme?.design ?? defaultPortalFrameDesign(),
        ),
        persisted: {
            buildingId: building.id,
            buildingSlug: building.slug,
            projectSlug,
            schemeId: activeScheme?.id ?? null,
            name: building.name,
            addressLabel: building.addressLabel,
        },
    };
}

/**
 * Pick the building the editor should activate on load: the focused building
 * when given, otherwise the first persisted building — preferring placed ones,
 * but falling back to a saved building without a location so its identity is
 * active and adding a location updates it instead of creating a new building.
 */
export function findInitialCustomBuilding(
    buildings: CustomBuilding[],
    focusBuildingSlug: string | null = null,
): CustomBuilding | null {
    if (focusBuildingSlug) {
        const focused = buildings.find(
            (building) =>
                building.persisted?.buildingSlug === focusBuildingSlug,
        );

        if (focused) {
            return focused;
        }
    }

    return (
        buildings.find(
            (building) => building.persisted && isPlacedOnMap(building),
        ) ??
        buildings.find((building) => building.persisted) ??
        null
    );
}

/** Bounding dimensions used for camera framing and map placement. */
export function portalFrameBounds(design: PortalFrameDesign): {
    width: number;
    depth: number;
    height: number;
} {
    const pitchRadians = (design.roofPitchDeg * Math.PI) / 180;
    const apexHeight =
        design.eavesHeight + (design.span / 2) * Math.tan(pitchRadians);

    return {
        width: design.span,
        depth: design.buildingLength,
        height: apexHeight,
    };
}
