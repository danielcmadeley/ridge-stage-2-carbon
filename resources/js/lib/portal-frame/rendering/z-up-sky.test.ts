import { describe, expect, it } from 'vitest';
import {
    sunPositionZUp,
    Z_UP_SKY,
} from '@/lib/portal-frame/rendering/z-up-sky';

describe('sunPositionZUp', () => {
    it('places the sun on the Z-up zenith axis at 90° elevation', () => {
        const sun = sunPositionZUp(0, 90);

        expect(sun.x).toBeCloseTo(0, 5);
        expect(sun.y).toBeCloseTo(0, 5);
        expect(sun.z).toBeCloseTo(1, 5);
    });

    it('places the sun on the horizon in the +X direction at 0° elevation', () => {
        const sun = sunPositionZUp(0, 0);

        expect(sun.x).toBeCloseTo(1, 5);
        expect(sun.y).toBeCloseTo(0, 5);
        expect(sun.z).toBeCloseTo(0, 5);
    });

    it('uses Z as the sky up vector', () => {
        expect(Z_UP_SKY.toArray()).toEqual([0, 0, 1]);
    });
});
