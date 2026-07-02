import {
    BufferGeometry,
    DoubleSide,
    Float32BufferAttribute,
    Group,
    Line,
    LineBasicMaterial,
    Mesh,
    MeshBasicMaterial,
    RingGeometry,
} from 'three';
import { extractStructuralNodes } from '@/lib/portal-frame/model/member-nodes';
import type { FrameMember } from '@/types/portal-frame';
import { PORTAL_FRAME_STEEL_COLOR } from '@/types/portal-frame';

const NODE_INNER_RADIUS_M = 0.06;
const NODE_OUTER_RADIUS_M = 0.12;

function createMemberStick(member: FrameMember): Line {
    const geometry = new BufferGeometry();
    geometry.setAttribute(
        'position',
        new Float32BufferAttribute([...member.start, ...member.end], 3),
    );

    const material = new LineBasicMaterial({
        color: PORTAL_FRAME_STEEL_COLOR,
        linewidth: 2,
    });

    return new Line(geometry, material);
}

function createNodeMarker(position: [number, number, number]): Mesh {
    const geometry = new RingGeometry(
        NODE_INNER_RADIUS_M,
        NODE_OUTER_RADIUS_M,
        32,
    );
    const material = new MeshBasicMaterial({
        color: PORTAL_FRAME_STEEL_COLOR,
        side: DoubleSide,
    });
    const mesh = new Mesh(geometry, material);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.rotation.x = -Math.PI / 2;

    return mesh;
}

export function createStickAnalysisGroup(members: FrameMember[]): Group {
    const group = new Group();
    const structuralMembers = members.filter(
        (member) => member.role !== 'foundation',
    );

    for (const member of structuralMembers) {
        group.add(createMemberStick(member));
    }

    for (const node of extractStructuralNodes(members)) {
        group.add(createNodeMarker(node));
    }

    return group;
}
