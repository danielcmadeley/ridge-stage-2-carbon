import type { Intersection, Object3D } from 'three';
import { Vector3 } from 'three';
import type { AnalyticalForceMode } from '@/lib/portal-frame/force-diagram-3d';
import type { MemberAnalysisResult } from '@/lib/portal-frame/frame-analysis';
import { memberBasis } from '@/lib/portal-frame/member-basis';
import type { FrameMember } from '@/types/portal-frame';

export const FORCE_DIAGRAM_HOVER_KEY = 'forceDiagramHover';

export type ForceDiagramHoverUserData = {
    member: FrameMember;
    analysis: MemberAnalysisResult;
    mode: AnalyticalForceMode;
};

export type ForceDiagramHoverInfo = {
    memberLabel: string;
    stationM: number;
    forceLabel: string;
    formattedValue: string;
    clientX: number;
    clientY: number;
};

export function isForceDiagramHoverObject(
    object: Object3D,
): object is Object3D & { userData: { [FORCE_DIAGRAM_HOVER_KEY]: ForceDiagramHoverUserData } } {
    return FORCE_DIAGRAM_HOVER_KEY in object.userData;
}

export function formatMemberLabel(memberId: string, role: 'column' | 'rafter'): string {
    const match = memberId.match(/^frame-(\d+)-(column|rafter)-(left|right)$/);

    if (!match) {
        return memberId;
    }

    const [, frameIndex, , side] = match;
    const sideLabel = side === 'left' ? 'Left' : 'Right';
    const roleLabel = role === 'column' ? 'column' : 'rafter';

    return `${sideLabel} ${roleLabel} (frame ${frameIndex})`;
}

export function forceModeLabel(mode: AnalyticalForceMode): string {
    if (mode === 'shear') {
        return 'Shear';
    }

    if (mode === 'axial') {
        return 'Axial';
    }

    return 'Moment';
}

export function formatForceValue(mode: AnalyticalForceMode, value: number): string {
    if (mode === 'moment') {
        return `${value.toFixed(1)} kN·m`;
    }

    return `${value.toFixed(1)} kN`;
}

export function stationFromLocalPoint(member: FrameMember, localPoint: Vector3): number {
    const basis = memberBasis(member);
    const relative = localPoint.clone().sub(basis.start);
    const station = relative.dot(basis.memberAxis);

    return Math.max(0, Math.min(basis.lengthM, station));
}

export function interpolateForceAtStation(
    stationsM: number[],
    values: number[],
    stationM: number,
): number {
    if (stationsM.length === 0 || values.length === 0) {
        return 0;
    }

    if (stationM <= stationsM[0]) {
        return values[0];
    }

    const lastIndex = stationsM.length - 1;

    if (stationM >= stationsM[lastIndex]) {
        return values[lastIndex];
    }

    for (let index = 0; index < lastIndex; index++) {
        const nextIndex = index + 1;

        if (stationM >= stationsM[index] && stationM <= stationsM[nextIndex]) {
            const span = stationsM[nextIndex] - stationsM[index];

            if (span === 0) {
                return values[index];
            }

            const ratio = (stationM - stationsM[index]) / span;

            return values[index] + ratio * (values[nextIndex] - values[index]);
        }
    }

    return values[lastIndex];
}

export function valuesForForceMode(
    analysis: MemberAnalysisResult,
    mode: AnalyticalForceMode,
): number[] {
    if (mode === 'shear') {
        return analysis.shearKn;
    }

    if (mode === 'axial') {
        return analysis.axialKn;
    }

    return analysis.momentKnm;
}

export function resolveForceDiagramHover(
    intersection: Intersection,
    frameGroupLocalPoint: Vector3,
    clientX: number,
    clientY: number,
): ForceDiagramHoverInfo | null {
    if (!isForceDiagramHoverObject(intersection.object)) {
        return null;
    }

    const { member, analysis, mode } = intersection.object.userData[FORCE_DIAGRAM_HOVER_KEY];
    const stationM = stationFromLocalPoint(member, frameGroupLocalPoint);
    const values = valuesForForceMode(analysis, mode);
    const forceValue = interpolateForceAtStation(analysis.stationsM, values, stationM);

    return {
        memberLabel: formatMemberLabel(member.id, member.role as 'column' | 'rafter'),
        stationM,
        forceLabel: forceModeLabel(mode),
        formattedValue: formatForceValue(mode, forceValue),
        clientX,
        clientY,
    };
}

export function collectForceDiagramObjects(root: Object3D): Object3D[] {
    const targets: Object3D[] = [];

    root.traverse((object) => {
        if (isForceDiagramHoverObject(object)) {
            targets.push(object);
        }
    });

    return targets;
}
