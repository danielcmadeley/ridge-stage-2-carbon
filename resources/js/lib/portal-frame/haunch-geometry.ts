import { Mesh, MeshStandardMaterial } from 'three';
import {
    createTaperedTopAnchoredIShapeGeometry,
    memberPlacementMatrix,
} from '@/lib/portal-frame/i-shape-geometry';
import { memberBasis, memberLengthM } from '@/lib/portal-frame/member-basis';
import type { FrameMember, UbSectionDimensions } from '@/types/portal-frame';
import { PORTAL_FRAME_STEEL_COLOR } from '@/types/portal-frame';

export const HAUNCH_DEPTH_FACTOR = 1.5;
export const HAUNCH_LENGTH_FRACTION = 0.1;

/**
 * Cut-depth multiplier along the haunch: 1.5× at the column, tapering to zero at the far end.
 */
export function haunchDepthFactorAt(positionFraction: number): number {
    return HAUNCH_DEPTH_FACTOR * (1 - positionFraction);
}

/**
 * Build a haunch FrameMember using the rafter UB section, running 10% of the
 * analysis rafter length along the rafter bottom flange from the column end.
 * The member start/end define where the haunch top flange meets the rafter.
 */
export function buildEavesHaunchMember(
    renderRafter: FrameMember,
    analysisRafter: FrameMember,
): FrameMember {
    const basis = memberBasis(renderRafter);
    const rafterHalfDepthM = renderRafter.section.h / 2000;
    const haunchLengthM = memberLengthM(analysisRafter) * HAUNCH_LENGTH_FRACTION;

    const start = basis.start
        .clone()
        .sub(basis.majorAxis.clone().multiplyScalar(rafterHalfDepthM));

    const end = start.clone().add(basis.memberAxis.clone().multiplyScalar(haunchLengthM));

    return {
        id: renderRafter.id.replace('-rafter-', '-haunch-'),
        role: 'haunch',
        start: [start.x, start.y, start.z],
        end: [end.x, end.y, end.z],
        section: haunchSectionFromRafter(renderRafter.section),
    };
}

export function haunchSectionFromRafter(
    rafterSection: UbSectionDimensions,
): UbSectionDimensions {
    return { ...rafterSection };
}

export function createEavesHaunchMesh(
    renderRafter: FrameMember,
    analysisRafter: FrameMember,
) {
    const haunch = buildEavesHaunchMember(renderRafter, analysisRafter);
    const lengthM = memberLengthM(haunch);
    const geometry = createTaperedTopAnchoredIShapeGeometry(
        haunch.section,
        lengthM,
        HAUNCH_DEPTH_FACTOR,
        0,
    );
    const material = new MeshStandardMaterial({
        color: PORTAL_FRAME_STEEL_COLOR,
        metalness: 0.3,
        roughness: 0.55,
    });
    const mesh = new Mesh(geometry, material);
    mesh.applyMatrix4(memberPlacementMatrix(haunch));

    return mesh;
}

export function createEavesHaunches(
    analysisMembers: FrameMember[],
    renderMembers: FrameMember[],
) {
    const analysisRafters = new Map(
        analysisMembers
            .filter((member) => member.role === 'rafter')
            .map((member) => [member.id, member]),
    );

    return renderMembers
        .filter((member) => member.role === 'rafter')
        .flatMap((renderRafter) => {
            const analysisRafter = analysisRafters.get(renderRafter.id);

            if (!analysisRafter) {
                return [];
            }

            return [createEavesHaunchMesh(renderRafter, analysisRafter)];
        });
}
