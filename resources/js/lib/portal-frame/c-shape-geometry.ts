import { ExtrudeGeometry, Shape } from 'three';
import type { CSectionDimensions } from '@/types/portal-frame';

/**
 * Cold-formed C section profile in the local XY plane, centred on depth.
 * Flange lip extends in +X from the web at the top.
 */
export function createCShapeGeometry(
    section: CSectionDimensions,
    lengthM: number,
): ExtrudeGeometry {
    const depth = section.depth / 1000;
    const flange = section.flange / 1000;
    const t = section.t / 1000;
    const halfDepth = depth / 2;

    const shape = new Shape();
    shape.moveTo(0, -halfDepth);
    shape.lineTo(flange, -halfDepth);
    shape.lineTo(flange, -halfDepth + t);
    shape.lineTo(t, -halfDepth + t);
    shape.lineTo(t, halfDepth - t);
    shape.lineTo(flange, halfDepth - t);
    shape.lineTo(flange, halfDepth);
    shape.lineTo(0, halfDepth);
    shape.closePath();

    return new ExtrudeGeometry(shape, {
        depth: lengthM,
        bevelEnabled: false,
    });
}

/** @return list of [x, y] points in metres for IFC arbitrary profiles. */
export function cShapeProfilePoints(section: CSectionDimensions): [number, number][] {
    const depth = section.depth / 1000;
    const flange = section.flange / 1000;
    const t = section.t / 1000;
    const halfDepth = depth / 2;

    return [
        [0, -halfDepth],
        [flange, -halfDepth],
        [flange, -halfDepth + t],
        [t, -halfDepth + t],
        [t, halfDepth - t],
        [flange, halfDepth - t],
        [flange, halfDepth],
        [0, halfDepth],
    ];
}
