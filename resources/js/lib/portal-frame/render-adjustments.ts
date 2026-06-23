import { memberBasis } from '@/lib/portal-frame/member-basis';
import type { FrameMember } from '@/types/portal-frame';

const POSITION_TOLERANCE = 1e-6;

/**
 * Move rafter start from the analysis node to the column inner flange face
 * so solid 3D members do not overlap at the eaves connection.
 */
export function trimRafterAtColumnFace(
    rafter: FrameMember,
    column: FrameMember,
): FrameMember {
    const columnX = column.start[0];
    const halfFlangeWidthM = column.section.b / 2000;
    const innerFaceX =
        columnX + Math.sign(-columnX || 1) * halfFlangeWidthM;

    const start = rafter.start;
    const end = rafter.end;
    const deltaX = end[0] - start[0];

    if (Math.abs(deltaX) < POSITION_TOLERANCE) {
        return rafter;
    }

    const trimFraction = (innerFaceX - start[0]) / deltaX;

    if (trimFraction <= 0 || trimFraction >= 1) {
        return rafter;
    }

    const trimmedStart: [number, number, number] = [
        start[0] + trimFraction * (end[0] - start[0]),
        start[1] + trimFraction * (end[1] - start[1]),
        start[2] + trimFraction * (end[2] - start[2]),
    ];

    return {
        ...rafter,
        start: trimmedStart,
    };
}

/**
 * Extend the column to the top flange of the rafter at the eaves connection.
 */
export function extendColumnToRafterTop(
    column: FrameMember,
    rafter: FrameMember,
): FrameMember {
    const { majorAxis } = memberBasis(rafter);
    const halfRafterDepthM = rafter.section.h / 2000;
    const verticalExtension = majorAxis.z * halfRafterDepthM;

    return {
        ...column,
        end: [
            column.end[0],
            column.end[1],
            column.end[2] + verticalExtension,
        ],
    };
}

function columnIdForRafter(rafterId: string): string {
    return rafterId.replace('-rafter-', '-column-');
}

function rafterIdForColumn(columnId: string): string {
    return columnId.replace('-column-', '-rafter-');
}

/**
 * Apply visual-only geometry adjustments for the solid 3D render.
 * Analysis members remain unchanged.
 */
export function adjustMembersForRendering(members: FrameMember[]): FrameMember[] {
    const columnsById = new Map(
        members
            .filter((member) => member.role === 'column')
            .map((member) => [member.id, member]),
    );
    const raftersById = new Map(
        members
            .filter((member) => member.role === 'rafter')
            .map((member) => [member.id, member]),
    );

    const trimmedRafters = new Map<string, FrameMember>();

    for (const member of members) {
        if (member.role !== 'rafter') {
            continue;
        }

        const column = columnsById.get(columnIdForRafter(member.id));

        if (!column) {
            continue;
        }

        trimmedRafters.set(
            member.id,
            trimRafterAtColumnFace(member, column),
        );
    }

    return members.map((member) => {
        if (member.role === 'rafter') {
            return trimmedRafters.get(member.id) ?? member;
        }

        if (member.role === 'column') {
            const rafter = raftersById.get(rafterIdForColumn(member.id));

            if (!rafter) {
                return member;
            }

            return extendColumnToRafterTop(member, rafter);
        }

        return member;
    });
}
