import type { CSectionDimensions } from '@/types/portal-frame';
import cSectionsCsv from '../../../../../data/c_sections.csv?raw';

function normalizeDesignation(designation: string): string {
    return designation.replace(/\s+/g, ' ').trim().toLowerCase();
}

function parseCSections(csv: string): Map<string, CSectionDimensions> {
    const sections = new Map<string, CSectionDimensions>();
    const lines = csv.trim().split('\n').slice(1);

    for (const line of lines) {
        const row = line.split(',');

        if (!row[0]) {
            continue;
        }

        const section: CSectionDimensions = {
            profile: 'c',
            name: row[0],
            massPerMKg: Number(row[1]),
            areaCm2: Number(row[2]),
            depth: Number(row[3]),
            flange: Number(row[4]),
            t: Number(row[5]),
        };

        sections.set(normalizeDesignation(section.name), section);
    }

    return sections;
}

const cSections = parseCSections(cSectionsCsv);

export function findCSection(designation: string): CSectionDimensions {
    const section = cSections.get(normalizeDesignation(designation));

    if (!section) {
        throw new Error(
            `C section not found for designation [${designation}].`,
        );
    }

    return section;
}
