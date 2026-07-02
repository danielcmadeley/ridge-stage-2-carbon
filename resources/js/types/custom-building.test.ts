import { describe, expect, it } from 'vitest';
import {
    customBuildingFromServer,
    findInitialCustomBuilding,
} from '@/types/custom-building';
import type { CustomBuilding } from '@/types/custom-building';
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

describe('findInitialCustomBuilding', () => {
    const makeBuilding = (
        id: string,
        options: { slug?: string; placed?: boolean } = {},
    ): CustomBuilding => ({
        id,
        origin: options.placed ? [-1.9, 52.4] : null,
        altitude: 0,
        rotation: [0, 0, 0],
        portalFrame: defaultPortalFrameDesign(),
        ...(options.slug
            ? {
                  persisted: {
                      buildingId: 1,
                      buildingSlug: options.slug,
                      projectSlug: 'riverside-depot',
                      schemeId: null,
                      name: options.slug,
                      addressLabel: null,
                  },
              }
            : {}),
    });

    it('prefers the focused building even when it has no location', () => {
        const buildings = [
            makeBuilding('server-1', { slug: 'shed-a', placed: true }),
            makeBuilding('server-2', { slug: 'shed-b' }),
        ];

        expect(findInitialCustomBuilding(buildings, 'shed-b')?.id).toBe(
            'server-2',
        );
    });

    it('falls back to the first placed persisted building', () => {
        const buildings = [
            makeBuilding('draft-1', { placed: true }),
            makeBuilding('server-1', { slug: 'shed-a' }),
            makeBuilding('server-2', { slug: 'shed-b', placed: true }),
        ];

        expect(findInitialCustomBuilding(buildings)?.id).toBe('server-2');
    });

    it('activates a saved building without a location so placement updates it', () => {
        const buildings = [
            makeBuilding('draft-1', { placed: true }),
            makeBuilding('server-1', { slug: 'shed-a' }),
        ];

        expect(findInitialCustomBuilding(buildings)?.id).toBe('server-1');
    });

    it('returns null when no building has been persisted', () => {
        expect(
            findInitialCustomBuilding([makeBuilding('draft-1')], 'shed-a'),
        ).toBeNull();
    });
});
