import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import {
    formatForceValue,
    formatMemberLabel,
    interpolateForceAtStation,
    stationFromLocalPoint,
} from '@/lib/portal-frame/force-diagram-hover';
import { buildPortalFrame } from '@/lib/portal-frame/geometry-builder';
import { defaultPortalFrameDesign } from '@/types/portal-frame';

describe('force diagram hover helpers', () => {
    it('formats member labels from member ids', () => {
        expect(formatMemberLabel('frame-0-column-left', 'column')).toBe(
            'Left column (frame 0)',
        );
        expect(formatMemberLabel('frame-2-rafter-right', 'rafter')).toBe(
            'Right rafter (frame 2)',
        );
    });

    it('formats force values with the correct units', () => {
        expect(formatForceValue('shear', 12.345)).toBe('12.3 kN');
        expect(formatForceValue('axial', -4.2)).toBe('-4.2 kN');
        expect(formatForceValue('moment', 8.76)).toBe('8.8 kN·m');
    });

    it('interpolates force values between sampled stations', () => {
        const stationsM = [0, 2, 4];
        const values = [0, 10, 20];

        expect(interpolateForceAtStation(stationsM, values, 0)).toBe(0);
        expect(interpolateForceAtStation(stationsM, values, 1)).toBe(5);
        expect(interpolateForceAtStation(stationsM, values, 4)).toBe(20);
        expect(interpolateForceAtStation(stationsM, values, 5)).toBe(20);
    });

    it('maps a world point to a station along the member centreline', () => {
        const built = buildPortalFrame(defaultPortalFrameDesign());
        const member = built.members.find((candidate) => candidate.id === 'frame-0-column-left');

        expect(member).toBeDefined();

        const localPoint = new Vector3(member!.start[0], member!.start[1], 2.5);

        expect(stationFromLocalPoint(member!, localPoint.clone())).toBeCloseTo(2.5, 6);
    });
});
