import { describe, expect, it } from 'vitest';
import { customBuildingFromServer } from '@/types/custom-building';
import { defaultPortalFrameDesign } from '@/types/portal-frame';
import type { ServerBuilding } from '@/types/scene';

const building: ServerBuilding = {
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
            name: 'Preferred',
            status: 'draft',
            design: {
                ...defaultPortalFrameDesign(),
                span: 24,
            },
            carbon: {
                totalCarbonKg: null,
                totalSteelKg: null,
                floorAreaM2: null,
                carbonIntensityKgM2: null,
                scorsBand: null,
            },
        },
        {
            id: 101,
            name: 'Focused',
            status: 'draft',
            design: {
                ...defaultPortalFrameDesign(),
                span: 30,
            },
            carbon: {
                totalCarbonKg: null,
                totalSteelKg: null,
                floorAreaM2: null,
                carbonIntensityKgM2: null,
                scorsBand: null,
            },
        },
    ],
};

describe('customBuildingFromServer', () => {
    it('loads the preferred scheme by default', () => {
        const customBuilding = customBuildingFromServer(
            building,
            'riverside-depot',
        );

        expect(customBuilding.portalFrame.span).toBe(24);
        expect(customBuilding.persisted?.schemeId).toBe(100);
    });

    it('loads a focused scheme when requested', () => {
        const customBuilding = customBuildingFromServer(
            building,
            'riverside-depot',
            101,
        );

        expect(customBuilding.portalFrame.span).toBe(30);
        expect(customBuilding.persisted?.schemeId).toBe(101);
    });
});
