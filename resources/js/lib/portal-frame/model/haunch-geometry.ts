import { Mesh } from 'three';
import {
    memberBasis,
    memberLengthM,
    isUbSection,
} from '@/lib/portal-frame/model/member-basis';
import {
    createTaperedTopAnchoredIShapeGeometry,
    memberPlacementMatrix,
} from '@/lib/portal-frame/rendering/geometries/i-shape-geometry';
import {
    configurePortalFrameMeshShadows,
    createRedOxideSteelMaterial,
} from '@/lib/portal-frame/rendering/portal-frame-materials';
import type { FrameMember, UbSectionDimensions } from '@/types/portal-frame';

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
 * frame span along the rafter bottom flange from the column end.
 * The member start/end define where the haunch top flange meets the rafter.
 */
export function buildEavesHaunchMember(
    renderRafter: FrameMember,
    spanM: number,
): FrameMember & { section: UbSectionDimensions } {
    if (!isUbSection(renderRafter.section)) {
        throw new Error('Eaves haunches require a UB rafter section.');
    }

    const basis = memberBasis(renderRafter);
    const rafterHalfDepthM = renderRafter.section.h / 2000;
    const haunchLengthM = spanM * HAUNCH_LENGTH_FRACTION;

    const start = basis.start
        .clone()
        .sub(basis.majorAxis.clone().multiplyScalar(rafterHalfDepthM));

    const end = start
        .clone()
        .add(basis.memberAxis.clone().multiplyScalar(haunchLengthM));

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
    spanM: number,
) {
    const haunch = buildEavesHaunchMember(renderRafter, spanM);
    const lengthM = memberLengthM(haunch);
    const geometry = createTaperedTopAnchoredIShapeGeometry(
        haunch.section,
        lengthM,
        HAUNCH_DEPTH_FACTOR,
        0,
    );
    const material = createRedOxideSteelMaterial();
    const mesh = new Mesh(geometry, material);
    mesh.applyMatrix4(memberPlacementMatrix(haunch));
    configurePortalFrameMeshShadows(mesh);

    return mesh;
}

export function createEavesHaunches(
    analysisMembers: FrameMember[],
    renderMembers: FrameMember[],
    spanM: number,
) {
    const analysisRafterIds = new Set(
        analysisMembers
            .filter((member) => member.role === 'rafter')
            .map((member) => member.id),
    );

    return renderMembers
        .filter((member) => member.role === 'rafter')
        .flatMap((renderRafter) => {
            if (!analysisRafterIds.has(renderRafter.id)) {
                return [];
            }

            return [createEavesHaunchMesh(renderRafter, spanM)];
        });
}
