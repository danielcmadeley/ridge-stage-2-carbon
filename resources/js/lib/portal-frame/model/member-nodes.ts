import type { FrameMember } from '@/types/portal-frame';

const POSITION_TOLERANCE = 1e-4;

function positionKey(point: [number, number, number]): string {
    return point.map((coordinate) => coordinate.toFixed(4)).join(':');
}

function pointsEqual(
    a: [number, number, number],
    b: [number, number, number],
): boolean {
    return (
        Math.abs(a[0] - b[0]) < POSITION_TOLERANCE &&
        Math.abs(a[1] - b[1]) < POSITION_TOLERANCE &&
        Math.abs(a[2] - b[2]) < POSITION_TOLERANCE
    );
}

/**
 * Collect unique structural node positions from analysis members.
 */
export function extractStructuralNodes(
    members: FrameMember[],
): [number, number, number][] {
    const nodes: [number, number, number][] = [];
    const seen = new Set<string>();

    for (const member of members) {
        if (member.role === 'foundation') {
            continue;
        }

        for (const point of [member.start, member.end]) {
            const key = positionKey(point);

            if (seen.has(key)) {
                continue;
            }

            seen.add(key);
            nodes.push(point);
        }
    }

    return nodes;
}

export { pointsEqual, positionKey };
