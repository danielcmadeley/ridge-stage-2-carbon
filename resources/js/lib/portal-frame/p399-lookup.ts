import p399Csv from '../../../../data/p399-portal-frame-data.csv?raw';
import {
    PORTAL_FRAME_TABULATED_SPANS,
    snapSpanToTabulated,
} from '@/types/portal-frame';

const TABULATED_SPANS = [...PORTAL_FRAME_TABULATED_SPANS];
const MIN_TABULATED_SPAN = Math.min(...TABULATED_SPANS);
const MAX_TABULATED_SPAN = Math.max(...TABULATED_SPANS);
const SNAP_TOLERANCE = 1e-6;

function normalizeNumericKey(value: number): string {
    const normalized = value.toFixed(4).replace(/\.?0+$/, '');

    return normalized === '' ? '0' : normalized;
}

type P399Data = {
    entries: Map<string, string>;
    lineLoadsKnM: number[];
    eavesHeightsM: number[];
};

function parseP399Data(csv: string): P399Data {
    const entries = new Map<string, string>();
    const lineLoadSet = new Set<number>();
    const eavesHeightSet = new Set<number>();
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

        const lineLoadValue = Number(lineLoad);
        const eavesHeightValue = Number(eavesHeight);

        if (Number.isNaN(lineLoadValue) || Number.isNaN(eavesHeightValue)) {
            continue;
        }

        lineLoadSet.add(lineLoadValue);
        eavesHeightSet.add(eavesHeightValue);

        TABULATED_SPANS.forEach((tabulatedSpan, index) => {
            const designation = (row[index + 3] ?? '').trim();
            const entryKey = `${currentMemberType!.toLowerCase()}|${normalizeNumericKey(lineLoadValue)}|${normalizeNumericKey(eavesHeightValue)}|${normalizeNumericKey(tabulatedSpan)}`;
            entries.set(entryKey, designation);
        });
    }

    return {
        entries,
        lineLoadsKnM: [...lineLoadSet].sort((a, b) => a - b),
        eavesHeightsM: [...eavesHeightSet].sort((a, b) => a - b),
    };
}

const { entries: p399Entries, lineLoadsKnM, eavesHeightsM } = parseP399Data(p399Csv);

/**
 * Round a value up to the nearest tabulated value (the conservative, safe
 * choice for a load/geometry table). Values at or below the smallest tabulated
 * value snap up to that smallest value. Returns null when the value exceeds the
 * largest tabulated value (out of scope).
 */
function snapUpToTabulated(value: number, tabulated: number[]): number | null {
    for (const candidate of tabulated) {
        if (candidate >= value - SNAP_TOLERANCE) {
            return candidate;
        }
    }

    return null;
}

export function lookupP399Section(
    memberType: string,
    lineLoadKnM: number,
    eavesHeightM: number,
    spanM: number,
): string {
    if (
        spanM < MIN_TABULATED_SPAN - SNAP_TOLERANCE ||
        spanM > MAX_TABULATED_SPAN + SNAP_TOLERANCE
    ) {
        throw new Error(
            `P399 covers spans from ${MIN_TABULATED_SPAN} m to ${MAX_TABULATED_SPAN} m; ${spanM} m is out of scope.`,
        );
    }

    const maxLineLoad = lineLoadsKnM[lineLoadsKnM.length - 1];
    const lookupLineLoad = snapUpToTabulated(lineLoadKnM, lineLoadsKnM);

    if (lookupLineLoad === null) {
        throw new Error(
            `P399 covers rafter line loads up to ${maxLineLoad} kN/m; ${lineLoadKnM.toFixed(2)} kN/m is out of scope.`,
        );
    }

    const maxEavesHeight = eavesHeightsM[eavesHeightsM.length - 1];
    const lookupEavesHeight = snapUpToTabulated(eavesHeightM, eavesHeightsM);

    if (lookupEavesHeight === null) {
        throw new Error(
            `P399 covers eaves heights up to ${maxEavesHeight} m; ${eavesHeightM} m is out of scope.`,
        );
    }

    const lookupSpan = snapSpanToTabulated(spanM);
    const entryKey = `${memberType.toLowerCase()}|${normalizeNumericKey(lookupLineLoad)}|${normalizeNumericKey(lookupEavesHeight)}|${normalizeNumericKey(lookupSpan)}`;
    const designation = p399Entries.get(entryKey);

    if (!designation || designation === '*') {
        throw new Error(
            `P399 has no ${memberType} section for ${lookupLineLoad} kN/m, ${lookupEavesHeight} m eaves, ${lookupSpan} m span.`,
        );
    }

    return designation;
}

export { snapSpanToTabulated };
