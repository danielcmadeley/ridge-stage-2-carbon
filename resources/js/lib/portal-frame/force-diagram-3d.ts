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
import type { MemberAnalysisResult } from '@/lib/portal-frame/frame-analysis';
import {
    forceDiagramScale,
    memberLineFromPoints,
} from '@/lib/portal-frame/force-diagram-geometry';
import { memberBasis } from '@/lib/portal-frame/member-basis';
import type { FrameMember } from '@/types/portal-frame';

export type AnalyticalForceMode = 'shear' | 'moment';

const FORCE_DIAGRAM_COLOR = '#dc2626';

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

function offsetPointAtStation(
    member: FrameMember,
    stationM: number,
    value: number,
    scale: number,
    sign: 1 | -1,
): Vector3 {
    const basis = memberBasis(member);
    const centre = centrelinePointAtStation(member, stationM);
    const offset = basis.majorAxis.clone().multiplyScalar(sign * scale * value);

    return centre.add(offset);
}

function createShearLine(
    member: FrameMember,
    analysis: MemberAnalysisResult,
    scale: number,
): Line {
    const positions: number[] = [];

    for (let index = 0; index < analysis.stationsM.length; index++) {
        const point = offsetPointAtStation(
            member,
            analysis.stationsM[index],
            analysis.shearKn[index],
            scale,
            1,
        );
        positions.push(point.x, point.y, point.z);
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));

    return new Line(
        geometry,
        new LineBasicMaterial({ color: FORCE_DIAGRAM_COLOR }),
    );
}

function createMomentFillMesh(
    member: FrameMember,
    analysis: MemberAnalysisResult,
    scale: number,
): Mesh {
    const stationCount = analysis.stationsM.length;
    const vertices: number[] = [];
    const indices: number[] = [];

    for (let index = 0; index < stationCount; index++) {
        const centre = centrelinePointAtStation(member, analysis.stationsM[index]);
        const offset = offsetPointAtStation(
            member,
            analysis.stationsM[index],
            analysis.momentKnm[index],
            scale,
            -1,
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

    return new Mesh(
        geometry,
        new MeshBasicMaterial({
            color: FORCE_DIAGRAM_COLOR,
            transparent: true,
            opacity: 0.35,
            side: DoubleSide,
            depthWrite: false,
        }),
    );
}

function createMomentOutlineLine(
    member: FrameMember,
    analysis: MemberAnalysisResult,
    scale: number,
): Line {
    const positions: number[] = [];

    for (let index = 0; index < analysis.stationsM.length; index++) {
        const point = offsetPointAtStation(
            member,
            analysis.stationsM[index],
            analysis.momentKnm[index],
            scale,
            -1,
        );
        positions.push(point.x, point.y, point.z);
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));

    return new Line(
        geometry,
        new LineBasicMaterial({ color: FORCE_DIAGRAM_COLOR }),
    );
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

    const frameZeroLines = analysisMembers.map((member) =>
        memberLineFromPoints(member.start, member.end),
    );
    const valuesByMember =
        mode === 'shear'
            ? analysisMembers.map((member) => member.shearKn)
            : analysisMembers.map((member) => member.momentKnm);
    const scale = forceDiagramScale(frameZeroLines, valuesByMember);

    const structuralMembers = members.filter(
        (member) => member.role === 'column' || member.role === 'rafter',
    );

    for (const member of structuralMembers) {
        const analysis = analysisByKey.get(memberAnalysisKey(member.id));

        if (!analysis) {
            continue;
        }

        if (mode === 'shear') {
            group.add(createShearLine(member, analysis, scale));
        } else {
            group.add(createMomentFillMesh(member, analysis, scale));
            group.add(createMomentOutlineLine(member, analysis, scale));
        }
    }

    return group;
}
