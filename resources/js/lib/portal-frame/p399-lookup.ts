import p399Csv from '../../../../data/p399-portal-frame-data.csv?raw';
import {
    PORTAL_FRAME_TABULATED_SPANS,
    snapSpanToTabulated,
} from '@/types/portal-frame';

const TABULATED_SPANS = [...PORTAL_FRAME_TABULATED_SPANS];

function normalizeNumericKey(value: number): string {
    const normalized = value.toFixed(4).replace(/\.?0+$/, '');

    return normalized === '' ? '0' : normalized;
}

function parseP399Entries(csv: string): Map<string, string> {
    const entries = new Map<string, string>();
    const lines = csv.trim().split('\n').slice(2);
    let currentMemberType: string | null = null;

    for (const line of lines) {
        const row = line.split(',');

        const memberType = (row[0] ?? '').trim();

        if (memberType !== '') {
            currentMemberType = memberType;
        }

        if (!currentMemberType) {
            continue;
        }

        const lineLoad = (row[1] ?? '').trim();
        const eavesHeight = (row[2] ?? '').trim();

        if (lineLoad === '' || eavesHeight === '') {
            continue;
        }

        TABULATED_SPANS.forEach((tabulatedSpan, index) => {
            const designation = (row[index + 3] ?? '').trim();
            const entryKey = `${currentMemberType!.toLowerCase()}|${lineLoad}|${eavesHeight}|${tabulatedSpan}`;
            entries.set(entryKey, designation);
        });
    }

    return entries;
}

const p399Entries = parseP399Entries(p399Csv);

export function lookupP399Section(
    memberType: string,
    lineLoadKnM: number,
    eavesHeightM: number,
    spanM: number,
): string {
    const lookupSpan = snapSpanToTabulated(spanM);
    const entryKey = `${memberType.toLowerCase()}|${normalizeNumericKey(lineLoadKnM)}|${normalizeNumericKey(eavesHeightM)}|${lookupSpan}`;
    const designation = p399Entries.get(entryKey);

    if (!designation || designation === '*') {
        throw new Error(
            `P399 section unavailable for ${memberType} at ${lineLoadKnM} kN/m, ${eavesHeightM} m eaves, ${lookupSpan} m span.`,
        );
    }

    return designation;
}

export { snapSpanToTabulated };
