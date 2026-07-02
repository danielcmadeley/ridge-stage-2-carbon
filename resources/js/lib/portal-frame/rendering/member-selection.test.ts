import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import type { Intersection, Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import {
    applyFrameMemberHighlight,
    collectFrameMemberPickTargets,
    describeFrameMember,
    isFrameMemberMeta,
    resolveFrameMemberPick,
    tagFrameMemberMesh,
} from '@/lib/portal-frame/rendering/member-selection';
import type { FrameMember, UbSectionDimensions } from '@/types/portal-frame';

const ubSection: UbSectionDimensions = {
    profile: 'ub',
    name: '533 x 210 x 92',
    h: 533.1,
    b: 209.3,
    tw: 10.1,
    tf: 15.6,
    iyCm4: 55230,
    areaCm2: 117,
    massPerMKg: 92.1,
};

function steelMember(overrides: Partial<FrameMember> = {}): FrameMember {
    return {
        id: 'frame-0-rafter-left',
        role: 'rafter',
        start: [0, 0, 6],
        end: [10, 0, 6],
        section: ubSection,
        ...overrides,
    };
}

function taggedMesh(member: FrameMember, color = 0x943c32): Mesh {
    const mesh = new Mesh(
        new BoxGeometry(1, 1, 1),
        new MeshStandardMaterial({ color }),
    );
    tagFrameMemberMesh(mesh, member);

    return mesh;
}

describe('isFrameMemberMeta', () => {
    it('accepts a tagged frame member', () => {
        expect(isFrameMemberMeta(steelMember())).toBe(true);
    });

    it('rejects non-member values', () => {
        expect(isFrameMemberMeta(null)).toBe(false);
        expect(isFrameMemberMeta({ id: 'x' })).toBe(false);
        expect(isFrameMemberMeta({ id: 'x', role: 'roof' })).toBe(false);
    });
});

describe('collectFrameMemberPickTargets', () => {
    it('collects tagged member meshes and the ground slab occluder', () => {
        const group = new Group();
        const member = taggedMesh(steelMember());
        const slab = new Mesh(
            new BoxGeometry(1, 1, 1),
            new MeshStandardMaterial(),
        );
        slab.name = 'ground-floor-slab';
        const untagged = new Mesh(
            new BoxGeometry(1, 1, 1),
            new MeshStandardMaterial(),
        );
        group.add(member, slab, untagged);

        const targets = collectFrameMemberPickTargets(group);

        expect(targets).toContain(member);
        expect(targets).toContain(slab);
        expect(targets).not.toContain(untagged);
    });
});

function intersectionWith(object: Object3D): Intersection {
    return { object, distance: 0, point: new Vector3() };
}

describe('resolveFrameMemberPick', () => {
    it('resolves the member from a tagged mesh intersection', () => {
        const member = steelMember();
        const mesh = taggedMesh(member);

        expect(resolveFrameMemberPick(intersectionWith(mesh))).toEqual(member);
    });

    it('returns null for a slab intersection', () => {
        const slab = new Mesh(
            new BoxGeometry(1, 1, 1),
            new MeshStandardMaterial(),
        );
        slab.name = 'ground-floor-slab';

        expect(resolveFrameMemberPick(intersectionWith(slab))).toBe(null);
    });
});

describe('applyFrameMemberHighlight', () => {
    it('darkens the hovered mesh and restores it when hover clears', () => {
        const group = new Group();
        const member = steelMember();
        const mesh = taggedMesh(member, 0xffffff);
        group.add(mesh);
        const baseHex = (mesh.material as MeshStandardMaterial).color.getHex();

        applyFrameMemberHighlight(group, member.id, null);
        const hoveredHex = (
            mesh.material as MeshStandardMaterial
        ).color.getHex();
        expect(hoveredHex).toBeLessThan(baseHex);

        applyFrameMemberHighlight(group, null, null);
        expect((mesh.material as MeshStandardMaterial).color.getHex()).toBe(
            baseHex,
        );
    });

    it('darkens a selected mesh more than a hovered one', () => {
        const group = new Group();
        const hovered = steelMember({ id: 'hovered' });
        const selected = steelMember({ id: 'selected' });
        const hoveredMesh = taggedMesh(hovered, 0xffffff);
        const selectedMesh = taggedMesh(selected, 0xffffff);
        group.add(hoveredMesh, selectedMesh);

        applyFrameMemberHighlight(group, 'hovered', 'selected');

        expect(
            (selectedMesh.material as MeshStandardMaterial).color.getHex(),
        ).toBeLessThan(
            (hoveredMesh.material as MeshStandardMaterial).color.getHex(),
        );
    });
});

describe('describeFrameMember', () => {
    it('describes a steel member with section, length, and mass', () => {
        const description = describeFrameMember(steelMember());

        expect(description.title).toBe('Rafter');
        expect(description.rows).toEqual([
            { label: 'Section', value: '533 x 210 x 92' },
            { label: 'Length', value: '10.00 m' },
            { label: 'Mass', value: '92.1 kg/m' },
            { label: 'Total', value: '921 kg' },
        ]);
    });

    it('labels roles for display', () => {
        expect(
            describeFrameMember(steelMember({ role: 'gable_column' })).title,
        ).toBe('Gable column');
        expect(
            describeFrameMember(steelMember({ role: 'side_rail' })).title,
        ).toBe('Side rail');
        expect(describeFrameMember(steelMember({ role: 'haunch' })).title).toBe(
            'Eaves haunch',
        );
    });

    it('describes a pad foundation by its footing dimensions', () => {
        const description = describeFrameMember(
            steelMember({
                role: 'foundation',
                footing: { width: 1.8, depth: 1.8, height: 0.6 },
            }),
        );

        expect(description.title).toBe('Pad foundation');
        expect(description.rows).toEqual([
            { label: 'Plan', value: '1.80 × 1.80 m' },
            { label: 'Height', value: '0.60 m' },
        ]);
    });

    it('describes a pile foundation by diameter and depth', () => {
        const description = describeFrameMember(
            steelMember({
                role: 'foundation',
                pile: { diameter: 0.45, depth: 8 },
            }),
        );

        expect(description.title).toBe('Pile foundation');
        expect(description.rows).toEqual([
            { label: 'Diameter', value: '0.45 m' },
            { label: 'Depth', value: '8.00 m' },
        ]);
    });
});
