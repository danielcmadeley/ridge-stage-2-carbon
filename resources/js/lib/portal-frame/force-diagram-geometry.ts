export type Point2D = [number, number];

export type MemberLine = {
    start: Point2D;
    end: Point2D;
};

/**
 * Unit vector along member (x, z) and outward normal in the X–Z plane.
 */
export function memberDirectionVectors(member: MemberLine): {
    axis: Point2D;
    normal: Point2D;
    length: number;
} {
    const dx = member.end[0] - member.start[0];
    const dz = member.end[1] - member.start[1];
    const length = Math.hypot(dx, dz);

    if (length < 1e-9) {
        return { axis: [1, 0], normal: [0, 1], length: 0 };
    }

    const axis: Point2D = [dx / length, dz / length];
    const normal: Point2D = [-axis[1], axis[0]];

    return { axis, normal, length };
}

/**
 * Centreline point at distance s along member from start (m).
 */
export function pointAlongMember(member: MemberLine, distanceM: number): Point2D {
    const { axis, length } = memberDirectionVectors(member);
    const fraction = length === 0 ? 0 : distanceM / length;

    return [
        member.start[0] + axis[0] * length * fraction,
        member.start[1] + axis[1] * length * fraction,
    ];
}

/**
 * Polyline offset from member centreline by scaled force values.
 * Positive values offset along the member normal; negative along -normal.
 */
export function offsetForceDiagram(
    member: MemberLine,
    stationsM: number[],
    values: number[],
    scale: number,
    sign: 1 | -1 = 1,
): Point2D[] {
    const { normal } = memberDirectionVectors(member);

    return stationsM.map((station, index) => {
        const centre = pointAlongMember(member, station);
        const offset = sign * scale * values[index];

        return [
            centre[0] + normal[0] * offset,
            centre[1] + normal[1] * offset,
        ];
    });
}

/**
 * Closed polygon tracing centreline, offset curve, and return leg for filled diagrams.
 */
export function closedForceDiagramPolygon(
    member: MemberLine,
    stationsM: number[],
    values: number[],
    scale: number,
    sign: 1 | -1 = 1,
): Point2D[] {
    const centreline = stationsM.map((station) => pointAlongMember(member, station));
    const offset = offsetForceDiagram(member, stationsM, values, scale, sign);

    return [...centreline, ...offset.reverse()];
}

/**
 * Compute a display scale so max diagram ordinate is ~fraction of frame size.
 */
export function forceDiagramScale(
    members: MemberLine[],
    valuesByMember: number[][],
    sizeFraction = 0.1,
): number {
    let frameSize = 0;

    for (const member of members) {
        const { length } = memberDirectionVectors(member);
        frameSize = Math.max(frameSize, length, member.start[0], member.end[0]);
        frameSize = Math.max(
            frameSize,
            member.start[1],
            member.end[1],
            Math.abs(member.start[0]),
            Math.abs(member.end[0]),
        );
    }

    let maxAbsValue = 0;

    for (const values of valuesByMember) {
        for (const value of values) {
            maxAbsValue = Math.max(maxAbsValue, Math.abs(value));
        }
    }

    if (maxAbsValue < 1e-9) {
        return 1;
    }

    const spanExtent = members.reduce((max, member) => {
        const xs = [member.start[0], member.end[0]];
        const zs = [member.start[1], member.end[1]];

        return Math.max(
            max,
            Math.max(...xs.map(Math.abs)),
            Math.max(...zs),
        );
    }, 1);

    return (spanExtent * sizeFraction) / maxAbsValue;
}

export function memberLineFromPoints(start: Point2D, end: Point2D): MemberLine {
    return { start, end };
}
