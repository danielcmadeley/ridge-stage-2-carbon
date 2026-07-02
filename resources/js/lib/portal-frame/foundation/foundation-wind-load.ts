import type { PortalFrameDesign } from '@/types/portal-frame';

/**
 * Stage-2 reference wind pressure (kN/m²) on the frame tributary area.
 * Calibrated so the default 24 m span / 6 m eaves interior bay sees ~40 kN —
 * the order of magnitude in the pad foundation worked examples.
 */
export const FOUNDATION_REFERENCE_WIND_PRESSURE_KN_M2 = 1.1;

/**
 * Characteristic horizontal wind at a column base for foundation sizing (kN).
 *
 * Foundation sizers treat horizontal load as a variable wind action (F_Wx,k),
 * not the horizontal equilibrium reaction from gravity on pitched rafters. That
 * frame-analysis reaction grows when columns shorten, which incorrectly drove
 * larger foundations at lower eaves heights.
 */
export function foundationWindLoadKn(design: PortalFrameDesign): number {
    const pitchRadians = (design.roofPitchDeg * Math.PI) / 180;
    const meanHeightM =
        design.eavesHeight + (design.span / 4) * Math.tan(pitchRadians);
    const tributaryWidthM = design.baySpacing;

    return (
        FOUNDATION_REFERENCE_WIND_PRESSURE_KN_M2 *
        meanHeightM *
        tributaryWidthM
    );
}
