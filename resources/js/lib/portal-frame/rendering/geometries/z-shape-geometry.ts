import { ExtrudeGeometry, Shape } from 'three';
import type { ZSectionDimensions } from '@/types/portal-frame';

/**
 * Cold-formed Z purlin profile in the local XY plane, centred on depth.
 * Top flange extends in +X, bottom flange in -X (standard Z orientation).
 */
export function createZShapeGeometry(
    section: ZSectionDimensions,
    lengthM: number,
): ExtrudeGeometry {
    const depth = section.depth / 1000;
    const topFlange = section.topFlange / 1000;
    const bottomFlange = section.bottomFlange / 1000;
    const t = section.t / 1000;
    const halfDepth = depth / 2;

    const shape = new Shape();
    shape.moveTo(-bottomFlange, -halfDepth);
    shape.lineTo(0, -halfDepth);
    shape.lineTo(0, halfDepth - t);
    shape.lineTo(topFlange - t, halfDepth - t);
    shape.lineTo(topFlange - t, halfDepth);
    shape.lineTo(0, halfDepth);
    shape.lineTo(0, -halfDepth + t);
    shape.lineTo(-bottomFlange + t, -halfDepth + t);
    shape.lineTo(-bottomFlange + t, -halfDepth);
    shape.closePath();

    return new ExtrudeGeometry(shape, {
        depth: lengthM,
        bevelEnabled: false,
    });
}

/** @return list of [x, y] points in metres for IFC arbitrary profiles. */
export function zShapeProfilePoints(
    section: ZSectionDimensions,
): [number, number][] {
    const depth = section.depth / 1000;
    const topFlange = section.topFlange / 1000;
    const bottomFlange = section.bottomFlange / 1000;
    const t = section.t / 1000;
    const halfDepth = depth / 2;

    return [
        [-bottomFlange, -halfDepth],
        [0, -halfDepth],
        [0, halfDepth - t],
        [topFlange - t, halfDepth - t],
        [topFlange - t, halfDepth],
        [0, halfDepth],
        [0, -halfDepth + t],
        [-bottomFlange + t, -halfDepth + t],
        [-bottomFlange + t, -halfDepth],
    ];
}
