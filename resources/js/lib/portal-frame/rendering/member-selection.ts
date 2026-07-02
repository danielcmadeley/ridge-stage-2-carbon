import type { Intersection, Object3D } from 'three';
import { Color, Mesh, MeshStandardMaterial } from 'three';
import { memberLengthM } from '@/lib/portal-frame/model/member-basis';
import type { FrameMember, FrameMemberRole } from '@/types/portal-frame';

export const FRAME_MEMBER_KEY = 'portalFrameMember';
const BASE_COLOR_KEY = 'portalFrameBaseColor';
const GROUND_FLOOR_SLAB_NAME = 'ground-floor-slab';

const HOVER_DARKEN_FACTOR = 0.78;
const SELECTED_DARKEN_FACTOR = 0.58;

const ROLE_LABELS: Record<FrameMemberRole, string> = {
    column: 'Column',
    gable_column: 'Gable column',
    rafter: 'Rafter',
    foundation: 'Foundation',
    haunch: 'Eaves haunch',
    tie: 'Tie',
    brace: 'Brace',
    purlin: 'Purlin',
    side_rail: 'Side rail',
};

export function isFrameMemberMeta(value: unknown): value is FrameMember {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const candidate = value as Partial<FrameMember>;

    return (
        typeof candidate.id === 'string' &&
        typeof candidate.role === 'string' &&
        candidate.role in ROLE_LABELS
    );
}

/**
 * Attach the source member to a mesh so pointer picking can resolve it, and
 * remember the material's base colour so highlights can be undone.
 */
export function tagFrameMemberMesh(mesh: Mesh, member: FrameMember): void {
    mesh.userData[FRAME_MEMBER_KEY] = member;

    if (mesh.material instanceof MeshStandardMaterial) {
        mesh.userData[BASE_COLOR_KEY] = mesh.material.color.getHex();
    }
}

/**
 * Meshes the member picker should raycast against: every tagged member plus
 * the ground slab, so members buried below the slab cannot be picked through it.
 */
export function collectFrameMemberPickTargets(root: Object3D): Mesh[] {
    const targets: Mesh[] = [];

    root.traverse((child) => {
        if (!(child instanceof Mesh)) {
            return;
        }

        if (
            isFrameMemberMeta(child.userData[FRAME_MEMBER_KEY]) ||
            child.name === GROUND_FLOOR_SLAB_NAME
        ) {
            targets.push(child);
        }
    });

    return targets;
}

export function resolveFrameMemberPick(
    intersection: Intersection,
): FrameMember | null {
    const meta = intersection.object.userData[FRAME_MEMBER_KEY];

    return isFrameMemberMeta(meta) ? meta : null;
}

/**
 * Darken hovered and selected member meshes; restore everything else to its
 * base colour. Selection reads darker than hover so the two states stack.
 */
export function applyFrameMemberHighlight(
    root: Object3D,
    hoveredId: string | null,
    selectedId: string | null,
): void {
    root.traverse((child) => {
        if (!(child instanceof Mesh)) {
            return;
        }

        const meta = child.userData[FRAME_MEMBER_KEY];
        const baseColor = child.userData[BASE_COLOR_KEY];

        if (
            !isFrameMemberMeta(meta) ||
            typeof baseColor !== 'number' ||
            !(child.material instanceof MeshStandardMaterial)
        ) {
            return;
        }

        const factor =
            meta.id === selectedId
                ? SELECTED_DARKEN_FACTOR
                : meta.id === hoveredId
                  ? HOVER_DARKEN_FACTOR
                  : 1;

        child.material.color = new Color(baseColor).multiplyScalar(factor);
    });
}

export type FrameMemberDescription = {
    title: string;
    rows: { label: string; value: string }[];
};

export function describeFrameMember(
    member: FrameMember,
): FrameMemberDescription {
    if (member.role === 'foundation' && member.pile) {
        return {
            title: 'Pile foundation',
            rows: [
                {
                    label: 'Diameter',
                    value: `${member.pile.diameter.toFixed(2)} m`,
                },
                { label: 'Depth', value: `${member.pile.depth.toFixed(2)} m` },
            ],
        };
    }

    if (member.role === 'foundation' && member.footing) {
        return {
            title: 'Pad foundation',
            rows: [
                {
                    label: 'Plan',
                    value: `${member.footing.width.toFixed(2)} × ${member.footing.depth.toFixed(2)} m`,
                },
                {
                    label: 'Height',
                    value: `${member.footing.height.toFixed(2)} m`,
                },
            ],
        };
    }

    const lengthM = memberLengthM(member);
    const rows = [
        { label: 'Section', value: member.section.name },
        { label: 'Length', value: `${lengthM.toFixed(2)} m` },
        {
            label: 'Mass',
            value: `${member.section.massPerMKg.toFixed(1)} kg/m`,
        },
    ];

    if (lengthM > 0) {
        rows.push({
            label: 'Total',
            value: `${Math.round(lengthM * member.section.massPerMKg)} kg`,
        });
    }

    return { title: ROLE_LABELS[member.role], rows };
}
