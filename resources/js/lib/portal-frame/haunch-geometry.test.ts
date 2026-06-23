import { BufferGeometry } from 'three';
import { describe, expect, it } from 'vitest';
import { findUbSection } from '@/lib/portal-frame/ub-sections';
import { buildPortalFrame } from '@/lib/portal-frame/geometry-builder';
import {
    buildEavesHaunchMember,
    createEavesHaunches,
    createEavesHaunchMesh,
    HAUNCH_DEPTH_FACTOR,
    HAUNCH_LENGTH_FRACTION,
    haunchDepthFactorAt,
    haunchSectionFromRafter,
} from '@/lib/portal-frame/haunch-geometry';
import { createTaperedTopAnchoredIShapeGeometry } from '@/lib/portal-frame/i-shape-geometry';
import { memberBasis, memberLengthM } from '@/lib/portal-frame/member-basis';
import { adjustMembersForRendering } from '@/lib/portal-frame/render-adjustments';
import { defaultPortalFrameDesign } from '@/types/portal-frame';

describe('haunchDepthFactorAt', () => {
    it('is 1.5 at the column and zero at the far end', () => {
        expect(haunchDepthFactorAt(0)).toBe(HAUNCH_DEPTH_FACTOR);
        expect(haunchDepthFactorAt(1)).toBe(0);
    });
});

describe('buildEavesHaunchMember', () => {
    it('uses the rafter UB section and 10% analysis length', () => {
        const design = defaultPortalFrameDesign();
        const built = buildPortalFrame(design);
        const renderMembers = adjustMembersForRendering(built.members);
        const renderRafter = renderMembers.find(
            (member) => member.id === 'frame-0-rafter-left',
        );
        const analysisRafter = built.members.find(
            (member) => member.id === 'frame-0-rafter-left',
        );

        expect(renderRafter).toBeDefined();
        expect(analysisRafter).toBeDefined();

        const haunch = buildEavesHaunchMember(renderRafter!, analysisRafter!);

        expect(haunch.role).toBe('haunch');
        expect(haunch.section).toEqual(renderRafter!.section);
        expect(memberLengthM(haunch)).toBeCloseTo(
            memberLengthM(analysisRafter!) * HAUNCH_LENGTH_FRACTION,
            6,
        );
    });

    it('starts on the rafter bottom flange at the column end', () => {
        const design = defaultPortalFrameDesign();
        const built = buildPortalFrame(design);
        const renderMembers = adjustMembersForRendering(built.members);

        for (const side of ['left', 'right'] as const) {
            const renderRafter = renderMembers.find(
                (member) => member.id === `frame-0-rafter-${side}`,
            );
            const analysisRafter = built.members.find(
                (member) => member.id === `frame-0-rafter-${side}`,
            );
            const haunch = buildEavesHaunchMember(renderRafter!, analysisRafter!);
            const rafterBasis = memberBasis(renderRafter!);
            const rafterHalfDepthM = renderRafter!.section.h / 2000;
            const expectedStart = rafterBasis.start
                .clone()
                .sub(
                    rafterBasis.majorAxis
                        .clone()
                        .multiplyScalar(rafterHalfDepthM),
                );

            expect(haunch.start[0]).toBeCloseTo(expectedStart.x, 6);
            expect(haunch.start[1]).toBeCloseTo(expectedStart.y, 6);
            expect(haunch.start[2]).toBeCloseTo(expectedStart.z, 6);
            expect(haunch.start[2]).toBeLessThan(renderRafter!.start[2]);
        }
    });
});

describe('createTaperedTopAnchoredIShapeGeometry', () => {
    it('collapses to zero depth at the far end of the haunch', () => {
        const section = findUbSection('UB 356x171x45');
        const geometry = createTaperedTopAnchoredIShapeGeometry(
            section,
            1.2,
            HAUNCH_DEPTH_FACTOR,
            0,
            4,
        );
        const positions = geometry.getAttribute('position').array as Float32Array;
        const lastRingStart = 4 * 12 * 3;

        for (let vertex = 0; vertex < 12; vertex += 1) {
            const y = positions[lastRingStart + vertex * 3 + 1];
            expect(y).toBeCloseTo(0, 6);
        }
    });
});

describe('createEavesHaunches', () => {
    it('creates one haunch per rafter in the solid render', () => {
        const design = defaultPortalFrameDesign();
        const built = buildPortalFrame(design);
        const renderMembers = adjustMembersForRendering(built.members);
        const haunches = createEavesHaunches(built.members, renderMembers);
        const rafterCount = built.members.filter((member) => member.role === 'rafter').length;

        expect(haunches).toHaveLength(rafterCount);
    });

    it('renders haunches as tapered top-anchored UB extrusions below the rafter', () => {
        const design = defaultPortalFrameDesign();
        const built = buildPortalFrame(design);
        const renderMembers = adjustMembersForRendering(built.members);
        const haunchMesh = createEavesHaunches(built.members, renderMembers)[0];

        expect(haunchMesh.geometry).toBeInstanceOf(BufferGeometry);
    });

    it('tapers haunch depth to zero at the far end', () => {
        const design = defaultPortalFrameDesign();
        const built = buildPortalFrame(design);
        const renderMembers = adjustMembersForRendering(built.members);
        const renderRafter = renderMembers.find(
            (member) => member.id === 'frame-0-rafter-left',
        );
        const analysisRafter = built.members.find(
            (member) => member.id === 'frame-0-rafter-left',
        );
        const haunchMesh = createEavesHaunchMesh(renderRafter!, analysisRafter!);
        const positions = haunchMesh.geometry.getAttribute('position').array as Float32Array;
        const vertexCount = positions.length / 3;
        const ringCount = 17;
        const verticesPerRing = vertexCount / ringCount;
        const lastRingStart = (ringCount - 1) * verticesPerRing * 3;

        for (let vertex = 0; vertex < verticesPerRing; vertex += 1) {
            const y = positions[lastRingStart + vertex * 3 + 1];
            expect(y).toBeCloseTo(0, 6);
        }
    });
});

describe('haunchSectionFromRafter', () => {
    it('keeps the rafter UB designation unchanged', () => {
        const rafterSection = findUbSection('UB 356x171x45');
        const section = haunchSectionFromRafter(rafterSection);

        expect(section.name).toBe('UB 356x171x45');
        expect(section.h).toBe(rafterSection.h);
        expect(section.b).toBe(rafterSection.b);
    });
});
