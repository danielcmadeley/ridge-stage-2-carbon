import chsSectionsCsv from '../../../../data/chs_sections.csv?raw';
import type { ChsSectionDimensions } from '@/types/portal-frame';

function normalizeDesignation(designation: string): string {
    let normalized = designation.replace(/×/g, 'x').replace(/\s+/g, '').toLowerCase();

    if (normalized.startsWith('chs')) {
        normalized = normalized.slice(3);
    }

    if (normalized.endsWith('chs')) {
        normalized = normalized.slice(0, -3);
    }

    normalized = normalized.replace(/^x+|x+$/g, '');

    return `chs ${normalized}`;
}

function parseChsSections(csv: string): Map<string, ChsSectionDimensions> {
    const sections = new Map<string, ChsSectionDimensions>();
    const lines = csv.trim().split('\n').slice(5);
    let currentDiameter: number | null = null;

    for (const line of lines) {
        const row = line.split(',');

        if (row[0]) {
            currentDiameter = Number(row[0]);
        }

        if (currentDiameter === null || !row[1]) {
            continue;
        }

        const thicknessLabel = row[1].trim();
        const thickness = Number(thicknessLabel);
        const name = `${currentDiameter}x${thicknessLabel} CHS`;
        const section: ChsSectionDimensions = {
            profile: 'chs',
            name,
            d: currentDiameter,
            t: thickness,
            areaCm2: Number(row[3]),
            iCm4: Number(row[5]),
            massPerMKg: Number(row[2]),
        };

        sections.set(normalizeDesignation(name), section);
        sections.set(normalizeDesignation(`${currentDiameter}x${thicknessLabel}`), section);
    }

    return sections;
}

const chsSections = parseChsSections(chsSectionsCsv);

export function findChsSection(designation: string): ChsSectionDimensions {
    const section = chsSections.get(normalizeDesignation(designation));

    if (!section) {
        throw new Error(`CHS section not found for designation [${designation}].`);
    }

    return section;
}
