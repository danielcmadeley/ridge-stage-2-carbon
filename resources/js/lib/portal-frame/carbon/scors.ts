/**
 * IStructE SCORS (Structural Carbon Rating Scheme) bands for upfront embodied
 * carbon (A1–A5) expressed in kgCO2e per m² of gross internal floor area.
 *
 * Bands run in 50 kgCO2e/m² steps from a band-A ceiling of 150, so band B sits
 * below 200, C below 250, and so on, with G covering the high-carbon end.
 */
export type ScorsBand = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export type ScorsBandDefinition = {
    band: ScorsBand;
    /** Lower bound (inclusive) of the band in kgCO2e/m². */
    lowerBoundKgM2: number;
    /** Upper bound (exclusive) in kgCO2e/m²; null for the open-ended top band. */
    upperBoundKgM2: number | null;
};

export const SCORS_BANDS: ScorsBandDefinition[] = [
    { band: 'A', lowerBoundKgM2: 0, upperBoundKgM2: 150 },
    { band: 'B', lowerBoundKgM2: 150, upperBoundKgM2: 200 },
    { band: 'C', lowerBoundKgM2: 200, upperBoundKgM2: 250 },
    { band: 'D', lowerBoundKgM2: 250, upperBoundKgM2: 300 },
    { band: 'E', lowerBoundKgM2: 300, upperBoundKgM2: 350 },
    { band: 'F', lowerBoundKgM2: 350, upperBoundKgM2: 400 },
    { band: 'G', lowerBoundKgM2: 400, upperBoundKgM2: null },
];

/** Resolve the SCORS band for a carbon intensity in kgCO2e/m². */
export function scorsBandForIntensity(intensityKgM2: number): ScorsBand {
    for (const definition of SCORS_BANDS) {
        if (
            definition.upperBoundKgM2 === null ||
            intensityKgM2 < definition.upperBoundKgM2
        ) {
            return definition.band;
        }
    }

    return 'G';
}

export function scorsBandDefinition(band: ScorsBand): ScorsBandDefinition {
    const definition = SCORS_BANDS.find((entry) => entry.band === band);

    if (!definition) {
        throw new Error(`Unknown SCORS band [${band}].`);
    }

    return definition;
}
