import type { UbSectionDimensions } from '@/types/portal-frame';
import ubSectionsCsv from '../../../../../data/ub-sections.csv?raw';

function normalizeDesignation(designation: string): string {
    let normalized = designation.replace(/×/g, 'x').replace(/\s+/g, '');
    normalized = normalized.replace(/UKB$/i, '');
    normalized = normalized.replace(/^x+|x+$/g, '');

    if (normalized.toUpperCase().startsWith('UB')) {
        return normalized.toLowerCase();
    }

    return `ub ${normalized.toLowerCase()}`;
}

function parseUbSections(csv: string): Map<string, UbSectionDimensions> {
    const sections = new Map<string, UbSectionDimensions>();
    const lines = csv.trim().split('\n').slice(1);

    for (const line of lines) {
        const row = line.split(',');

        if (!row[0]) {
            continue;
        }

        const section: UbSectionDimensions = {
            profile: 'ub',
            name: row[0],
            h: Number(row[1]),
            b: Number(row[2]),
            tw: Number(row[3]),
            tf: Number(row[4]),
            areaCm2: Number(row[8]),
            iyCm4: Number(row[9]),
            massPerMKg: Number(row[45]),
        };

        sections.set(normalizeDesignation(section.name), section);
        sections.set(
            normalizeDesignation(section.name.replace(/^UB\s+/i, '')),
            section,
        );
    }

    return sections;
}

const ubSections = parseUbSections(ubSectionsCsv);

export function findUbSection(designation: string): UbSectionDimensions {
    const section = ubSections.get(normalizeDesignation(designation));

    if (!section) {
        throw new Error(
            `UB section not found for designation [${designation}].`,
        );
    }

    return section;
}
