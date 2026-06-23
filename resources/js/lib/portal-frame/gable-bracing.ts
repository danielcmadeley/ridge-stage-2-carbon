import type { ChsSectionDimensions, FrameMember } from '@/types/portal-frame';

/** Connection point on the adjacent-frame rafter, measured from eave toward ridge. */
export const GABLE_ROOF_BRACE_RAFTER_FRACTION = 0.5;

type GableEnd = 'front' | 'rear';

function pointOnRafter(
    x: number,
    y: number,
    eavesHeight: number,
    apexHeight: number,
    fraction: number,
): [number, number, number] {
    return [x * (1 - fraction), y, eavesHeight + fraction * (apexHeight - eavesHeight)];
}

function addWallXBracing(
    members: FrameMember[],
    gable: GableEnd,
    sideLabel: 'left' | 'right',
    x: number,
    yNear: number,
    yFar: number,
    eavesHeight: number,
    section: ChsSectionDimensions,
): void {
    const prefix = `gable-${gable}-${sideLabel}-wall`;

    members.push({
        id: `${prefix}-ascending`,
        role: 'brace',
        start: [x, yNear, 0],
        end: [x, yFar, eavesHeight],
        section,
    });

    members.push({
        id: `${prefix}-descending`,
        role: 'brace',
        start: [x, yNear, eavesHeight],
        end: [x, yFar, 0],
        section,
    });
}

function addRoofVBracing(
    members: FrameMember[],
    gable: GableEnd,
    sideLabel: 'left' | 'right',
    x: number,
    yEnd: number,
    yAdjacent: number,
    eavesHeight: number,
    apexHeight: number,
    section: ChsSectionDimensions,
): void {
    const prefix = `gable-${gable}-${sideLabel}-roof`;
    const connectionPoint = pointOnRafter(
        x,
        yAdjacent,
        eavesHeight,
        apexHeight,
        GABLE_ROOF_BRACE_RAFTER_FRACTION,
    );

    members.push({
        id: `${prefix}-from-eave`,
        role: 'brace',
        start: [x, yEnd, eavesHeight],
        end: connectionPoint,
        section,
    });

    members.push({
        id: `${prefix}-from-ridge`,
        role: 'brace',
        start: [0, yEnd, apexHeight],
        end: connectionPoint,
        section,
    });
}

function addGableEndBracing(
    members: FrameMember[],
    gable: GableEnd,
    yNear: number,
    yFar: number,
    halfSpan: number,
    eavesHeight: number,
    apexHeight: number,
    section: ChsSectionDimensions,
): void {
    const yEnd = gable === 'front' ? yNear : yFar;
    const yAdjacent = gable === 'front' ? yFar : yNear;

    for (const side of [-1, 1] as const) {
        const x = side * halfSpan;
        const sideLabel = side < 0 ? 'left' : 'right';

        addWallXBracing(members, gable, sideLabel, x, yNear, yFar, eavesHeight, section);
        addRoofVBracing(
            members,
            gable,
            sideLabel,
            x,
            yEnd,
            yAdjacent,
            eavesHeight,
            apexHeight,
            section,
        );
    }
}

export function buildGableEndBracing(
    frameCount: number,
    baySpacing: number,
    halfSpan: number,
    eavesHeight: number,
    apexHeight: number,
    section: ChsSectionDimensions,
): FrameMember[] {
    if (frameCount < 2) {
        return [];
    }

    const members: FrameMember[] = [];
    const rearNearFrame = frameCount - 2;
    const rearFarFrame = frameCount - 1;

    addGableEndBracing(members, 'front', 0, baySpacing, halfSpan, eavesHeight, apexHeight, section);
    addGableEndBracing(
        members,
        'rear',
        rearNearFrame * baySpacing,
        rearFarFrame * baySpacing,
        halfSpan,
        eavesHeight,
        apexHeight,
        section,
    );

    return members;
}
