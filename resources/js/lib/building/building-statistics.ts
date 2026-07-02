import { formatDimensionM } from '@/lib/portal-frame/rendering/dimension-format';
import type { BuildingPersistence } from '@/types/custom-building';
import type { PortalFrameDesign } from '@/types/portal-frame';
import type {
    ServerBuilding,
    ServerProject,
    ServerScheme,
} from '@/types/scene';

export type BuildingStatistic = {
    value: string;
    label: string;
};

export type PersistedBuildingContext = {
    project: ServerProject;
    building: ServerBuilding;
    scheme: ServerScheme | null;
};

export function findPersistedBuildingContext(
    projects: ServerProject[],
    persisted: BuildingPersistence,
): PersistedBuildingContext | null {
    const project = projects.find(
        (entry) => entry.slug === persisted.projectSlug,
    );

    if (!project) {
        return null;
    }

    const building = project.buildings?.find(
        (entry) => entry.id === persisted.buildingId,
    );

    if (!building) {
        return null;
    }

    const scheme = persisted.schemeId
        ? (building.schemes.find((entry) => entry.id === persisted.schemeId) ??
          null)
        : null;

    return { project, building, scheme };
}

export function schemeVersionLabel(
    scheme: ServerScheme | null,
    building: ServerBuilding | null,
    isUnsavedDraft: boolean,
): string {
    if (isUnsavedDraft) {
        return 'Draft';
    }

    if (!scheme) {
        return '—';
    }

    if (scheme.name) {
        return scheme.name;
    }

    const index =
        building?.schemes.findIndex((entry) => entry.id === scheme.id) ?? -1;

    return index >= 0 ? `Version ${index + 1}` : `Scheme ${scheme.id}`;
}

export function formatFloorAreaM2(areaM2: number): string {
    return `${Math.round(areaM2).toLocaleString('en-GB')} m²`;
}

export function formatBuildingDimensions(design: PortalFrameDesign): string {
    return `${formatDimensionM(design.span)} × ${formatDimensionM(design.buildingLength)}`;
}

/** Human-readable location for building statistics and reports. */
export function formatBuildingLocationLabel(input: {
    addressLabel?: string | null;
    origin?: [number, number] | null;
}): string | null {
    const address = input.addressLabel?.trim();

    if (address) {
        return address;
    }

    if (!input.origin) {
        return null;
    }

    const [longitude, latitude] = input.origin;

    return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

export function buildBuildingStatistics(input: {
    projects: ServerProject[];
    design: PortalFrameDesign;
    floorAreaM2: number;
    locationLabel: string | null;
    persisted: BuildingPersistence | undefined;
    fallbackProjectSlug: string | null;
}): BuildingStatistic[] {
    const context = input.persisted
        ? findPersistedBuildingContext(input.projects, input.persisted)
        : null;

    const projectName =
        context?.project.name ??
        (input.fallbackProjectSlug
            ? input.projects.find(
                  (entry) => entry.slug === input.fallbackProjectSlug,
              )?.name
            : null) ??
        'Not saved';

    const schemeVersion = schemeVersionLabel(
        context?.scheme ?? null,
        context?.building ?? null,
        !input.persisted?.schemeId,
    );

    return [
        { value: projectName, label: 'Project name' },
        { value: schemeVersion, label: 'Scheme version' },
        { value: input.locationLabel ?? 'Not set', label: 'Location' },
        { value: formatFloorAreaM2(input.floorAreaM2), label: 'Area' },
        {
            value: formatBuildingDimensions(input.design),
            label: 'Building dimensions',
        },
    ];
}
