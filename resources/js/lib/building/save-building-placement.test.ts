import { describe, expect, it } from 'vitest';
import { buildSaveBuildingPlacementPayload } from '@/lib/building/save-building-placement';

describe('buildSaveBuildingPlacementPayload', () => {
    it('maps a placed building to UpdateBuildingRequest fields', () => {
        expect(
            buildSaveBuildingPlacementPayload({
                latitude: 52.4,
                longitude: -1.9,
                altitude: 12.5,
                addressLabel: '1 Warehouse Way',
                rotation: [0, 45, 0],
            }),
        ).toEqual({
            latitude: 52.4,
            longitude: -1.9,
            altitude: 12.5,
            address_label: '1 Warehouse Way',
            rotation: [0, 45, 0],
        });
    });

    it('sends null coordinates to clear a saved location', () => {
        expect(
            buildSaveBuildingPlacementPayload({
                latitude: null,
                longitude: null,
                addressLabel: null,
            }),
        ).toEqual({
            latitude: null,
            longitude: null,
            address_label: null,
        });
    });
});
