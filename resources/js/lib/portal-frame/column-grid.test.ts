import { describe, expect, it } from 'vitest';
import { Line } from 'three';
import { createColumnGridGroup } from '@/lib/portal-frame/column-grid';
import { defaultPortalFrameDesign } from '@/types/portal-frame';

describe('createColumnGridGroup', () => {
    it('builds dashed grid lines, bubbles, and dimension callouts', () => {
        const group = createColumnGridGroup(defaultPortalFrameDesign());
        const lines = group.children.filter((child): child is Line => child instanceof Line);
        const dashedLines = lines.filter((child) => child.material.type === 'LineDashedMaterial');
        const solidLines = lines.filter((child) => child.material.type === 'LineBasicMaterial');

        expect(dashedLines).toHaveLength(14);
        expect(dashedLines[0]?.geometry.getAttribute('lineDistance')).toBeDefined();
        expect(solidLines.length).toBeGreaterThanOrEqual(9);
    });
});
