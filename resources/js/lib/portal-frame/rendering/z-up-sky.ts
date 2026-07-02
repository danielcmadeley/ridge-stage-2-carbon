import { MathUtils, Vector3 } from 'three';

/** Portal frame scenes use Z-up; Three.js Sky defaults to Y-up. */
export const Z_UP_SKY = new Vector3(0, 0, 1);

export function sunPositionZUp(
    azimuthDeg: number,
    elevationDeg: number,
): Vector3 {
    const phi = MathUtils.degToRad(90 - elevationDeg);
    const theta = MathUtils.degToRad(azimuthDeg);

    return new Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.sin(phi) * Math.sin(theta),
        Math.cos(phi),
    );
}

export type ZUpSkyOptions = {
    turbidity?: number;
    rayleigh?: number;
    mieCoefficient?: number;
    mieDirectionalG?: number;
    elevation?: number;
    azimuth?: number;
    distance?: number;
};

export function applyZUpSkyUniforms(
    material: { uniforms: Record<string, { value: unknown }> },
    options: Required<ZUpSkyOptions>,
): void {
    material.uniforms.up.value = Z_UP_SKY;
    material.uniforms.turbidity.value = options.turbidity;
    material.uniforms.rayleigh.value = options.rayleigh;
    material.uniforms.mieCoefficient.value = options.mieCoefficient;
    material.uniforms.mieDirectionalG.value = options.mieDirectionalG;
    material.uniforms.sunPosition.value = sunPositionZUp(
        options.azimuth,
        options.elevation,
    );
}
