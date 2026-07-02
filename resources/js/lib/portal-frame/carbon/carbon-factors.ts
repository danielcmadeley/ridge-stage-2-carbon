import carbonFactorsCsv from '../../../../../data/carbon_factors.csv?raw';

/** Embodied carbon factors in kgCO2e per kg of material. */
export type CarbonFactors = {
    /** Hot-rolled steel sections (columns, rafters, haunches, ties, bracing). */
    steelSection: number;
    /** Hot-dip galvanized steel (side rails and purlins). */
    galvanizedSteel: number;
    /** 28/35 MPa concrete used for foundations. */
    concrete: number;
    /** Steel reinforcement bar used in pad foundations and pile caps. */
    rebar: number;
};

const MATERIAL_KEYS: Record<keyof CarbonFactors, string> = {
    steelSection: 'steel, section',
    galvanizedSteel: 'steel, hot-dip galvanized steel',
    concrete: '28/35 mpa',
    rebar: 'steel, rebar',
};

/**
 * Read the first two fields (material name and factor) of a CSV row, honouring
 * double-quoted fields that contain commas. The carbon factor sheet keeps long
 * comma-laden comments in later columns, so a naive split would corrupt the name.
 */
function parseNameAndFactor(
    line: string,
): { name: string; factor: number } | null {
    const fields: string[] = [];
    let current = '';
    let insideQuotes = false;

    for (let index = 0; index < line.length && fields.length < 2; index++) {
        const character = line[index];

        if (character === '"') {
            insideQuotes = !insideQuotes;

            continue;
        }

        if (character === ',' && !insideQuotes) {
            fields.push(current);
            current = '';

            continue;
        }

        current += character;
    }

    if (fields.length < 2) {
        return null;
    }

    const name = fields[0].trim();
    const factor = Number(fields[1].trim());

    if (!name || !Number.isFinite(factor)) {
        return null;
    }

    return { name, factor };
}

function parseCarbonFactors(csv: string): CarbonFactors {
    const factorsByName = new Map<string, number>();

    for (const line of csv.trim().split('\n').slice(1)) {
        const parsed = parseNameAndFactor(line);

        if (parsed) {
            factorsByName.set(parsed.name.toLowerCase(), parsed.factor);
        }
    }

    const resolve = (material: keyof CarbonFactors): number => {
        const factor = factorsByName.get(MATERIAL_KEYS[material]);

        if (factor === undefined) {
            throw new Error(
                `Carbon factor not found for material [${MATERIAL_KEYS[material]}].`,
            );
        }

        return factor;
    };

    return {
        steelSection: resolve('steelSection'),
        galvanizedSteel: resolve('galvanizedSteel'),
        concrete: resolve('concrete'),
        rebar: resolve('rebar'),
    };
}

export const carbonFactors: CarbonFactors =
    parseCarbonFactors(carbonFactorsCsv);
