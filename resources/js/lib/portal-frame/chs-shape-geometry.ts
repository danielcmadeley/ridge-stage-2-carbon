import { CylinderGeometry } from 'three';
import type { ChsSectionDimensions } from '@/types/portal-frame';

export function createChsShapeGeometry(
    section: ChsSectionDimensions,
    lengthM: number,
): CylinderGeometry {
    const outerRadius = section.d / 2000;
    const geometry = new CylinderGeometry(outerRadius, outerRadius, lengthM, 32);
    geometry.rotateX(Math.PI / 2);
    geometry.translate(0, 0, lengthM / 2);

    return geometry;
}
