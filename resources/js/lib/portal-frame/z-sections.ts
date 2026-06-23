import zSectionsCsv from '../../../../data/z_sections.csv?raw';
import type { ZSectionDimensions } from '@/types/portal-frame';

function normalizeDesignation(designation: string): string {
    return designation.replace(/\s+/g, ' ').trim().toLowerCase();
}

function parseZSections(csv: string): Map<string, ZSectionDimensions> {
    const sections = new Map<string, ZSectionDimensions>();
    const lines = csv.trim().split('\n').slice(1);

    for (const line of lines) {
        const row = line.split(',');

        if (!row[0]) {
            continue;
        }

        const section: ZSectionDimensions = {
            profile: 'z',
            name: row[0],
            massPerMKg: Number(row[1]),
            areaCm2: Number(row[2]),
            depth: Number(row[3]),
            topFlange: Number(row[4]),
            bottomFlange: Number(row[5]),
            t: Number(row[6]),
        };

        sections.set(normalizeDesignation(section.name), section);
    }

    return sections;
}

const zSections = parseZSections(zSectionsCsv);

export function findZSection(designation: string): ZSectionDimensions {
    const section = zSections.get(normalizeDesignation(designation));

    if (!section) {
        throw new Error(`Z section not found for designation [${designation}].`);
    }

    return section;
}
