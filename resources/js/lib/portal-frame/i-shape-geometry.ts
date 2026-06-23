import {
    BoxGeometry,
    BufferGeometry,
    CylinderGeometry,
    ExtrudeGeometry,
    Float32BufferAttribute,
    Matrix4,
    Mesh,
    MeshStandardMaterial,
    Shape,
    Vector3,
} from 'three';
import { memberBasis } from '@/lib/portal-frame/member-basis';
import { createChsShapeGeometry } from '@/lib/portal-frame/chs-shape-geometry';
import { createCShapeGeometry } from '@/lib/portal-frame/c-shape-geometry';
import { createZShapeGeometry } from '@/lib/portal-frame/z-shape-geometry';
import type { FrameMember, UbSectionDimensions } from '@/types/portal-frame';
import {
    PORTAL_FRAME_FOUNDATION_COLOR,
    PORTAL_FRAME_SECONDARY_STEEL_COLOR,
    PORTAL_FRAME_STEEL_COLOR,
} from '@/types/portal-frame';

function createIShapeGeometry(
    hMm: number,
    bMm: number,
    twMm: number,
    tfMm: number,
    lengthM: number,
): ExtrudeGeometry {
    const h = hMm / 1000;
    const b = bMm / 1000;
    const tw = twMm / 1000;
    const tf = tfMm / 1000;
    const halfB = b / 2;
    const halfH = h / 2;
    const halfTw = tw / 2;

    const shape = new Shape();
    shape.moveTo(-halfB, halfH);
    shape.lineTo(halfB, halfH);
    shape.lineTo(halfB, halfH - tf);
    shape.lineTo(halfTw, halfH - tf);
    shape.lineTo(halfTw, -halfH + tf);
    shape.lineTo(halfB, -halfH + tf);
    shape.lineTo(halfB, -halfH);
    shape.lineTo(-halfB, -halfH);
    shape.lineTo(-halfB, -halfH + tf);
    shape.lineTo(-halfTw, -halfH + tf);
    shape.lineTo(-halfTw, halfH - tf);
    shape.lineTo(-halfB, halfH - tf);
    shape.closePath();

    return new ExtrudeGeometry(shape, {
        depth: lengthM,
        bevelEnabled: false,
    });
}

const BOTTOM_ANCHORED_I_PROFILE_VERTEX_COUNT = 12;

function bottomAnchoredIProfilePoints(
    depthM: number,
    bM: number,
    twM: number,
    tfM: number,
): [number, number][] {
    const halfB = bM / 2;
    const halfTw = twM / 2;

    return [
        [-halfB, 0],
        [halfB, 0],
        [halfB, tfM],
        [halfTw, tfM],
        [halfTw, depthM - tfM],
        [halfB, depthM - tfM],
        [halfB, depthM],
        [-halfB, depthM],
        [-halfB, depthM - tfM],
        [-halfTw, depthM - tfM],
        [-halfTw, tfM],
        [-halfB, tfM],
    ];
}

function topAnchoredIProfilePoints(
    depthM: number,
    bM: number,
    twM: number,
    tfM: number,
): [number, number][] {
    const halfB = bM / 2;
    const halfTw = twM / 2;

    if (depthM <= 1e-9) {
        return Array.from({ length: BOTTOM_ANCHORED_I_PROFILE_VERTEX_COUNT }, () => [0, 0]);
    }

    const effectiveTf = Math.min(tfM, depthM / 2);
    const webBottom = effectiveTf - depthM;

    return [
        [-halfB, 0],
        [halfB, 0],
        [halfB, -effectiveTf],
        [halfTw, -effectiveTf],
        [halfTw, webBottom],
        [halfB, webBottom],
        [halfB, -depthM],
        [-halfB, -depthM],
        [-halfB, webBottom],
        [-halfTw, webBottom],
        [-halfTw, -effectiveTf],
        [-halfB, -effectiveTf],
    ];
}

/**
 * I-section extruded along Z with depth tapering from start to end.
 * The top flange stays at y = 0 so the haunch hangs below a fixed diagonal.
 */
export function createTaperedTopAnchoredIShapeGeometry(
    section: UbSectionDimensions,
    lengthM: number,
    startDepthFactor: number,
    endDepthFactor: number,
    segments = 16,
): BufferGeometry {
    const bM = section.b / 1000;
    const twM = section.tw / 1000;
    const tfM = section.tf / 1000;
    const baseDepthM = section.h / 1000;
    const ringCount = segments + 1;
    const positions: number[] = [];
    const indices: number[] = [];

    for (let ring = 0; ring < ringCount; ring += 1) {
        const t = ring / segments;
        const depthM = baseDepthM * (startDepthFactor + (endDepthFactor - startDepthFactor) * t);
        const z = t * lengthM;
        const profile = topAnchoredIProfilePoints(depthM, bM, twM, tfM);

        for (const [x, y] of profile) {
            positions.push(x, y, z);
        }
    }

    for (let ring = 0; ring < segments; ring += 1) {
        const ringStart = ring * BOTTOM_ANCHORED_I_PROFILE_VERTEX_COUNT;
        const nextRingStart = (ring + 1) * BOTTOM_ANCHORED_I_PROFILE_VERTEX_COUNT;

        for (let vertex = 0; vertex < BOTTOM_ANCHORED_I_PROFILE_VERTEX_COUNT; vertex += 1) {
            const nextVertex = (vertex + 1) % BOTTOM_ANCHORED_I_PROFILE_VERTEX_COUNT;
            const a = ringStart + vertex;
            const b = ringStart + nextVertex;
            const c = nextRingStart + nextVertex;
            const d = nextRingStart + vertex;

            indices.push(a, b, c, a, c, d);
        }
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
}

/**
 * @deprecated Use createTaperedTopAnchoredIShapeGeometry for eaves haunches.
 */
export function createTaperedBottomAnchoredIShapeGeometry(
    section: UbSectionDimensions,
    lengthM: number,
    startDepthFactor: number,
    endDepthFactor: number,
    segments = 16,
): BufferGeometry {
    const bM = section.b / 1000;
    const twM = section.tw / 1000;
    const tfM = section.tf / 1000;
    const baseDepthM = section.h / 1000;
    const ringCount = segments + 1;
    const positions: number[] = [];
    const indices: number[] = [];

    for (let ring = 0; ring < ringCount; ring += 1) {
        const t = ring / segments;
        const depthM = baseDepthM * (startDepthFactor + (endDepthFactor - startDepthFactor) * t);
        const z = t * lengthM;
        const profile = bottomAnchoredIProfilePoints(depthM, bM, twM, tfM);

        for (const [x, y] of profile) {
            positions.push(x, y, z);
        }
    }

    for (let ring = 0; ring < segments; ring += 1) {
        const ringStart = ring * BOTTOM_ANCHORED_I_PROFILE_VERTEX_COUNT;
        const nextRingStart = (ring + 1) * BOTTOM_ANCHORED_I_PROFILE_VERTEX_COUNT;

        for (let vertex = 0; vertex < BOTTOM_ANCHORED_I_PROFILE_VERTEX_COUNT; vertex += 1) {
            const nextVertex = (vertex + 1) % BOTTOM_ANCHORED_I_PROFILE_VERTEX_COUNT;
            const a = ringStart + vertex;
            const b = ringStart + nextVertex;
            const c = nextRingStart + nextVertex;
            const d = nextRingStart + vertex;

            indices.push(a, b, c, a, c, d);
        }
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
}

function createFootingGeometry(
    widthM: number,
    depthM: number,
    heightM: number,
): BoxGeometry {
    return new BoxGeometry(widthM, depthM, heightM);
}

function createPileGeometry(diameterM: number, depthM: number): CylinderGeometry {
    const geometry = new CylinderGeometry(diameterM / 2, diameterM / 2, depthM, 32);
    geometry.rotateX(Math.PI / 2);

    return geometry;
}

export function memberPlacementMatrix(member: FrameMember): Matrix4 {
    const basis = memberBasis(member);

    if (basis.lengthM === 0) {
        return new Matrix4().makeTranslation(basis.start.x, basis.start.y, basis.start.z);
    }

    if (member.role === 'foundation') {
        return new Matrix4().makeTranslation(basis.start.x, basis.start.y, basis.start.z);
    }

    const matrix = new Matrix4();
    matrix.makeBasis(basis.minorAxis, basis.majorAxis, basis.memberAxis);
    matrix.setPosition(basis.start);

    return matrix;
}

export function createFrameMemberMesh(member: FrameMember): Mesh {
    const start = member.start;
    const end = member.end;
    const length = new Vector3(...end).sub(new Vector3(...start)).length();

    if (member.role === 'foundation' && member.pile) {
        const geometry = createPileGeometry(member.pile.diameter, member.pile.depth);
        const material = new MeshStandardMaterial({
            color: PORTAL_FRAME_FOUNDATION_COLOR,
            metalness: 0.05,
            roughness: 0.9,
        });
        const mesh = new Mesh(geometry, material);
        mesh.position.set(
            (start[0] + end[0]) / 2,
            (start[1] + end[1]) / 2,
            (start[2] + end[2]) / 2,
        );

        return mesh;
    }

    if (member.role === 'foundation' && member.footing) {
        const geometry = createFootingGeometry(
            member.footing.width,
            member.footing.depth,
            member.footing.height,
        );
        const material = new MeshStandardMaterial({
            color: PORTAL_FRAME_FOUNDATION_COLOR,
            metalness: 0.05,
            roughness: 0.9,
        });
        const mesh = new Mesh(geometry, material);
        mesh.position.set(start[0], start[1], start[2]);

        return mesh;
    }

    const geometry =
        member.section.profile === 'z'
            ? createZShapeGeometry(member.section, length)
            : member.section.profile === 'c'
              ? createCShapeGeometry(member.section, length)
              : member.section.profile === 'chs'
                ? createChsShapeGeometry(member.section, length)
                : createIShapeGeometry(
                      member.section.h,
                      member.section.b,
                      member.section.tw,
                      member.section.tf,
                      length,
                  );
    const steelColor =
        member.role === 'purlin' || member.role === 'side_rail'
            ? PORTAL_FRAME_SECONDARY_STEEL_COLOR
            : PORTAL_FRAME_STEEL_COLOR;
    const material = new MeshStandardMaterial({
        color: steelColor,
        metalness: member.role === 'purlin' || member.role === 'side_rail' ? 0.15 : 0.3,
        roughness: member.role === 'purlin' || member.role === 'side_rail' ? 0.75 : 0.55,
    });
    const mesh = new Mesh(geometry, material);
    mesh.applyMatrix4(memberPlacementMatrix(member));

    return mesh;
}

export function createPortalFrameGroup(members: FrameMember[]): Mesh[] {
    return members.map((member) => createFrameMemberMesh(member));
}
