import type { PortalFrameDesign } from '@/types/portal-frame';

/** A persisted design scheme, as returned by SchemeResource. */
export type ServerScheme = {
    id: number;
    name: string | null;
    status: 'draft' | 'verified' | 'archived';
    design: PortalFrameDesign;
    carbon: {
        totalCarbonKg: number | null;
        totalSteelKg: number | null;
        floorAreaM2: number | null;
        carbonIntensityKgM2: number | null;
        scorsBand: string | null;
    };
};

/** A persisted building, as returned by BuildingResource. */
export type ServerBuilding = {
    id: number;
    name: string;
    slug: string;
    /** GeoJSON order: [longitude, latitude]. Null until placed on the map. */
    origin: [number, number] | null;
    altitude: number | null;
    rotation: [number, number, number];
    addressLabel: string | null;
    preferredSchemeId: number | null;
    schemes: ServerScheme[];
};

/** A persisted project, as returned by ProjectResource. */
export type ServerProject = {
    id: number;
    name: string;
    slug: string;
    client: string | null;
    projectNumber: string | null;
    buildingsCount?: number;
    buildings?: ServerBuilding[];
};
