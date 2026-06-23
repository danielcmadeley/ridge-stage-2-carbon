import {
    BufferGeometry,
    DoubleSide,
    Float32BufferAttribute,
    Group,
    Line,
    LineBasicMaterial,
    Mesh,
    MeshBasicMaterial,
    Vector3,
} from 'three';
import {
    FORCE_DIAGRAM_HOVER_KEY,
    type ForceDiagramHoverUserData,
} from '@/lib/portal-frame/force-diagram-hover';
import type { MemberAnalysisResult } from '@/lib/portal-frame/frame-analysis';
import {
    forceDiagramScale,
    memberLineFromPoints,
} from '@/lib/portal-frame/force-diagram-geometry';
import { memberBasis } from '@/lib/portal-frame/member-basis';
import type { FrameMember } from '@/types/portal-frame';

export type AnalyticalForceMode = 'shear' | 'moment' | 'axial';

const FORCE_DIAGRAM_COLOR: Record<AnalyticalForceMode, string> = {
    shear: '#dc2626',
    moment: '#2563eb',
    axial: '#16a34a',
};

function memberAnalysisKey(memberId: string): string {
    const match = memberId.match(/^frame-\d+-(.+)$/);

    return match ? match[1] : memberId;
}

function centrelinePointAtStation(
    member: FrameMember,
    stationM: number,
): Vector3 {
    const basis = memberBasis(member);

    return basis.start
        .clone()
        .add(basis.memberAxis.clone().multiplyScalar(stationM));
}

/**
 * In-plane normal used to plot the bending-moment diagram on the member's
 * tension side. It is the member axis rotated +90° within the frame plane
 * (memberAxis (c, 0, s) -> (s, 0, -c)). Combined with the signed local moment
 * this is mirror-symmetric across the frame: equal physical moments on the
 * left and right members plot on the same physical face (hogging outwards at
 * the eaves, sagging inwards at the apex) instead of inverting.
 */
export function momentDiagramNormal(member: FrameMember): Vector3 {
    const axis = memberBasis(member).memberAxis;
    const normal = new Vector3(axis.z, 0, -axis.x);

    if (normal.lengthSq() < 1e-9) {
        return new Vector3(1, 0, 0);
    }

    return normal.normalize();
}

function offsetPointAtStation(
    member: FrameMember,
    normal: Vector3,
    stationM: number,
    value: number,
    scale: number,
    sign: 1 | -1,
): Vector3 {
    const centre = centrelinePointAtStation(member, stationM);
    const offset = normal.clone().multiplyScalar(sign * scale * value);

    return centre.add(offset);
}

function attachForceDiagramHoverData(
    object: Line | Mesh,
    member: FrameMember,
    analysis: MemberAnalysisResult,
    mode: AnalyticalForceMode,
): void {
    const hoverData: ForceDiagramHoverUserData = {
        member,
        analysis,
        mode,
    };

    object.userData[FORCE_DIAGRAM_HOVER_KEY] = hoverData;
}

function createDiagramLine(
    member: FrameMember,
    normal: Vector3,
    stationsM: number[],
    values: number[],
    scale: number,
    color: string,
    analysis: MemberAnalysisResult,
    mode: AnalyticalForceMode,
): Line {
    const positions: number[] = [];

    for (let index = 0; index < stationsM.length; index++) {
        const point = offsetPointAtStation(
            member,
            normal,
            stationsM[index],
            values[index],
            scale,
            1,
        );
        positions.push(point.x, point.y, point.z);
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));

    const line = new Line(geometry, new LineBasicMaterial({ color }));
    attachForceDiagramHoverData(line, member, analysis, mode);

    return line;
}

function createFillMesh(
    member: FrameMember,
    normal: Vector3,
    stationsM: number[],
    values: number[],
    scale: number,
    color: string,
    analysis: MemberAnalysisResult,
    mode: AnalyticalForceMode,
): Mesh {
    const stationCount = stationsM.length;
    const vertices: number[] = [];
    const indices: number[] = [];

    for (let index = 0; index < stationCount; index++) {
        const centre = centrelinePointAtStation(member, stationsM[index]);
        const offset = offsetPointAtStation(
            member,
            normal,
            stationsM[index],
            values[index],
            scale,
            1,
        );
        vertices.push(centre.x, centre.y, centre.z);
        vertices.push(offset.x, offset.y, offset.z);
    }

    for (let index = 0; index < stationCount - 1; index++) {
        const base = index * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const mesh = new Mesh(
        geometry,
        new MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.35,
            side: DoubleSide,
            depthWrite: false,
        }),
    );
    attachForceDiagramHoverData(mesh, member, analysis, mode);

    return mesh;
}

function createOutlineLine(
    member: FrameMember,
    normal: Vector3,
    stationsM: number[],
    values: number[],
    scale: number,
    color: string,
    analysis: MemberAnalysisResult,
    mode: AnalyticalForceMode,
): Line {
    const positions: number[] = [];

    for (let index = 0; index < stationsM.length; index++) {
        const point = offsetPointAtStation(
            member,
            normal,
            stationsM[index],
            values[index],
            scale,
            1,
        );
        positions.push(point.x, point.y, point.z);
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));

    const line = new Line(geometry, new LineBasicMaterial({ color }));
    attachForceDiagramHoverData(line, member, analysis, mode);

    return line;
}

export function createForceDiagramGroup(
    members: FrameMember[],
    analysisMembers: MemberAnalysisResult[],
    mode: AnalyticalForceMode,
): Group {
    const group = new Group();
    const analysisByKey = new Map(
        analysisMembers.map((member) => [memberAnalysisKey(member.id), member]),
    );

    const valuesFor = (member: MemberAnalysisResult): number[] => {
        if (mode === 'shear') {
            return member.shearKn;
        }

        if (mode === 'axial') {
            return member.axialKn;
        }

        return member.momentKnm;
    };

    const frameZeroLines = analysisMembers.map((member) =>
        memberLineFromPoints(member.start, member.end),
    );
    const valuesByMember = analysisMembers.map((member) => valuesFor(member));
    const scale = forceDiagramScale(frameZeroLines, valuesByMember);
    const color = FORCE_DIAGRAM_COLOR[mode];

    const structuralMembers = members.filter(
        (member) => member.role === 'column' || member.role === 'rafter',
    );

    for (const member of structuralMembers) {
        const analysis = analysisByKey.get(memberAnalysisKey(member.id));

        if (!analysis) {
            continue;
        }

        const values = valuesFor(analysis);

        if (mode === 'moment') {
            // Plot on the tension side so left/right members mirror rather than
            // invert: peak hogging at both eaves, sagging at the apex.
            const normal = momentDiagramNormal(member);
            group.add(
                createFillMesh(
                    member,
                    normal,
                    analysis.stationsM,
                    values,
                    scale,
                    color,
                    analysis,
                    mode,
                ),
            );
            group.add(
                createOutlineLine(
                    member,
                    normal,
                    analysis.stationsM,
                    values,
                    scale,
                    color,
                    analysis,
                    mode,
                ),
            );
        } else {
            const normal = memberBasis(member).majorAxis;
            group.add(
                createDiagramLine(
                    member,
                    normal,
                    analysis.stationsM,
                    values,
                    scale,
                    color,
                    analysis,
                    mode,
                ),
            );
        }
    }

    return group;
}
