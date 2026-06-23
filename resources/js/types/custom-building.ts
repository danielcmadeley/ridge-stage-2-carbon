import {
    defaultPortalFrameDesign,
    type PortalFrameDesign,
} from '@/types/portal-frame';

export type BuildingRotation = [x: number, y: number, z: number];

export type BuildingDraft = {
    portalFrame: PortalFrameDesign;
    rotation: BuildingRotation;
};

export type CustomBuilding = BuildingDraft & {
    id: string;
    origin: [lng: number, lat: number];
    altitude: number;
};

export const defaultBuildingDraft = (): BuildingDraft => ({
    portalFrame: defaultPortalFrameDesign(),
    rotation: [0, 0, 0],
});

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
