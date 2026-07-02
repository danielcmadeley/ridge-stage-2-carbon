import { Line } from 'three';
import type { Material } from 'three';
import { describe, expect, it } from 'vitest';
import { createColumnGridGroup } from '@/lib/portal-frame/rendering/column-grid/column-grid';
import { defaultPortalFrameDesign } from '@/types/portal-frame';

function lineMaterialType(line: Line): string {
    const material: Material | Material[] = line.material;

    return Array.isArray(material) ? material[0].type : material.type;
}

describe('createColumnGridGroup', () => {
    it('builds dashed grid lines, bubbles, and dimension callouts', () => {
        const group = createColumnGridGroup(defaultPortalFrameDesign());
        const lines = group.children.filter(
            (child): child is Line => child instanceof Line,
        );
        const dashedLines = lines.filter(
            (child) => lineMaterialType(child) === 'LineDashedMaterial',
        );
        const solidLines = lines.filter(
            (child) => lineMaterialType(child) === 'LineBasicMaterial',
        );

        expect(dashedLines).toHaveLength(14);
        expect(
            dashedLines[0]?.geometry.getAttribute('lineDistance'),
        ).toBeDefined();
        expect(dashedLines[0]?.userData.columnGridLine).toMatchObject({
            axis: 'x',
            index: 0,
            label: 'A',
        });
        expect(solidLines.length).toBeGreaterThanOrEqual(9);
    });
});
