export type BuildingDimensions = {
    width: number;
    depth: number;
    height: number;
};

export type BuildingRotation = [x: number, y: number, z: number];

export type BuildingDraft = {
    dimensions: BuildingDimensions;
    color: string;
    rotation: BuildingRotation;
};

export type CustomBuilding = BuildingDraft & {
    id: string;
    origin: [lng: number, lat: number];
    altitude: number;
};

export const defaultBuildingDraft = (): BuildingDraft => ({
    dimensions: { width: 20, depth: 15, height: 30 },
    color: '#6366f1',
    rotation: [0, 0, 0],
});
