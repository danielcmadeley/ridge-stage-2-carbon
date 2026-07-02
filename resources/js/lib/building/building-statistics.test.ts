import { describe, expect, it } from 'vitest';
import {
    buildBuildingStatistics,
    findPersistedBuildingContext,
    formatBuildingDimensions,
    formatBuildingLocationLabel,
    formatFloorAreaM2,
    schemeVersionLabel,
} from '@/lib/building/building-statistics';
import { defaultPortalFrameDesign } from '@/types/portal-frame';
import type { ServerProject } from '@/types/scene';

const projects: ServerProject[] = [
    {
        id: 1,
        name: 'Riverside Depot',
        slug: 'riverside-depot',
        client: null,
        projectNumber: null,
        buildings: [
            {
                id: 10,
                name: 'Shed A',
                slug: 'shed-a',
                origin: [-1.9, 52.4],
                altitude: null,
                rotation: [0, 0, 0],
                addressLabel: '1 Warehouse Way',
                preferredSchemeId: 100,
                schemes: [
                    {
                        id: 100,
                        name: 'Option A',
                        status: 'draft',
                        design: defaultPortalFrameDesign(),
                        carbon: {
                            totalCarbonKg: null,
                            totalSteelKg: null,
                            floorAreaM2: 960,
                            carbonIntensityKgM2: null,
                            scorsBand: null,
                        },
                    },
                    {
                        id: 101,
                        name: null,
                        status: 'draft',
                        design: defaultPortalFrameDesign(),
                        carbon: {
                            totalCarbonKg: null,
                            totalSteelKg: null,
                            floorAreaM2: null,
                            carbonIntensityKgM2: null,
                            scorsBand: null,
                        },
                    },
                ],
            },
        ],
    },
];

describe('findPersistedBuildingContext', () => {
    it('returns the matching project, building, and scheme', () => {
        expect(
            findPersistedBuildingContext(projects, {
                buildingId: 10,
                buildingSlug: 'shed-a',
                projectSlug: 'riverside-depot',
                schemeId: 100,
                name: 'Shed A',
                addressLabel: '1 Warehouse Way',
            }),
        ).toEqual({
            project: projects[0],
            building: projects[0].buildings?.[0],
            scheme: projects[0].buildings?.[0]?.schemes[0],
        });
    });
});

describe('schemeVersionLabel', () => {
    it('returns Draft for unsaved schemes', () => {
        expect(schemeVersionLabel(null, null, true)).toBe('Draft');
    });

    it('returns the scheme name when present', () => {
        expect(
            schemeVersionLabel(
                projects[0].buildings?.[0]?.schemes[0] ?? null,
                projects[0].buildings?.[0] ?? null,
                false,
            ),
        ).toBe('Option A');
    });

    it('falls back to a version number when the scheme has no name', () => {
        expect(
            schemeVersionLabel(
                projects[0].buildings?.[0]?.schemes[1] ?? null,
                projects[0].buildings?.[0] ?? null,
                false,
            ),
        ).toBe('Version 2');
    });
});

describe('formatFloorAreaM2', () => {
    it('formats floor area with grouping separators', () => {
        expect(formatFloorAreaM2(960)).toBe('960 m²');
        expect(formatFloorAreaM2(155400)).toBe('155,400 m²');
    });
});

describe('formatBuildingDimensions', () => {
    it('formats span and building length', () => {
        expect(formatBuildingDimensions(defaultPortalFrameDesign())).toBe(
            '24 m × 40 m',
        );
    });
});

describe('formatBuildingLocationLabel', () => {
    it('prefers a geocoded address when present', () => {
        expect(
            formatBuildingLocationLabel({
                addressLabel: '1 Warehouse Way',
                origin: [-1.9, 52.4],
            }),
        ).toBe('1 Warehouse Way');
    });

    it('falls back to coordinates when the building is placed without an address', () => {
        expect(
            formatBuildingLocationLabel({
                addressLabel: null,
                origin: [-1.9, 52.4],
            }),
        ).toBe('52.40000, -1.90000');
    });
});

describe('buildBuildingStatistics', () => {
    it('builds the sidebar statistics for a persisted building', () => {
        expect(
            buildBuildingStatistics({
                projects,
                design: defaultPortalFrameDesign(),
                floorAreaM2: 960,
                locationLabel: '1 Warehouse Way',
                persisted: {
                    buildingId: 10,
                    buildingSlug: 'shed-a',
                    projectSlug: 'riverside-depot',
                    schemeId: 100,
                    name: 'Shed A',
                    addressLabel: '1 Warehouse Way',
                },
                fallbackProjectSlug: null,
            }),
        ).toEqual([
            { value: 'Riverside Depot', label: 'Project name' },
            { value: 'Option A', label: 'Scheme version' },
            { value: '1 Warehouse Way', label: 'Location' },
            { value: '960 m²', label: 'Area' },
            { value: '24 m × 40 m', label: 'Building dimensions' },
        ]);
    });
});
