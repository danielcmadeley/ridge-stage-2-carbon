import { Group, Mesh } from 'three';
import { describe, expect, it } from 'vitest';
import {
    createSiteSceneryGroup,
    createStealOffcuts,
    createTowerCrane,
    createTrafficCone,
    replaceSiteSceneryGroup,
} from '@/lib/portal-frame/rendering/site-scenery';
import type { SiteSceneryMetrics } from '@/lib/portal-frame/rendering/site-scenery';

const metrics: SiteSceneryMetrics = {
    size: 25,
    span: 15,
    buildingLength: 30,
    apexHeight: 7,
};

describe('createSiteSceneryGroup', () => {
    it('returns a named group positioned at the building midpoint', () => {
        const group = createSiteSceneryGroup(metrics);

        expect(group).toBeInstanceOf(Group);
        expect(group.name).toBe('site-scenery');
        expect(group.position.y).toBe(-metrics.buildingLength / 2);
    });

    it('includes the ground, fence, containers, portacabin, crane and props', () => {
        const group = createSiteSceneryGroup(metrics);
        const names = new Set<string>();
        group.traverse((child) => {
            if (child.name) {
                names.add(child.name);
            }
        });

        expect(names.has('site-ground')).toBe(true);
        expect(names.has('site-fence')).toBe(true);
        expect(names.has('site-container')).toBe(true);
        expect(names.has('site-portacabin')).toBe(true);
        expect(names.has('site-crane')).toBe(true);
        expect(names.has('site-dirt-mound')).toBe(true);
        expect(names.has('site-pile-bundle')).toBe(true);
        expect(names.has('site-cone')).toBe(true);
    });

    it('traffic cones stand on the ground plane (z origin)', () => {
        const cone = createTrafficCone(metrics, 3, 4);

        expect(cone.position.z).toBe(0);
    });

    it('the tower crane clears the portal frame apex', () => {
        const crane = createTowerCrane(metrics, 0, 10);

        let topZ = 0;
        crane.traverse((child) => {
            if (child instanceof Mesh) {
                topZ = Math.max(topZ, child.position.z);
            }
        });

        expect(topZ).toBeGreaterThan(metrics.apexHeight);
    });

    it('steel offcuts are grounded at z origin', () => {
        const offcuts = createStealOffcuts(metrics, -5, 8);

        expect(offcuts.position.z).toBe(0);
    });
});

describe('replaceSiteSceneryGroup', () => {
    it('builds a fresh group and disposes the previous one', () => {
        const first = createSiteSceneryGroup(metrics);
        let ground: Mesh | undefined;
        first.traverse((child) => {
            if (child instanceof Mesh && child.name === 'site-ground') {
                ground = child;
            }
        });
        const groundGeoId = ground!.geometry.uuid;

        const replaced = replaceSiteSceneryGroup(first, metrics);

        expect(replaced).not.toBe(first);
        let newGround: Mesh | undefined;
        replaced.traverse((child) => {
            if (child instanceof Mesh && child.name === 'site-ground') {
                newGround = child;
            }
        });
        expect(newGround!.geometry.uuid).not.toBe(groundGeoId);
    });

    it('accepts a null current group', () => {
        const group = replaceSiteSceneryGroup(null, metrics);

        expect(group).toBeInstanceOf(Group);
    });
});
