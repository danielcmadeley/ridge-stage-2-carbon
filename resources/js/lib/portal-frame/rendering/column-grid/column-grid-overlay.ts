import type { Intersection, Object3D, LineDashedMaterial } from 'three';
import {
    BufferGeometry,
    Float32BufferAttribute,
    Group,
    Line,
    LineBasicMaterial,
} from 'three';
import { createDimensionLabelSprite } from '@/lib/portal-frame/rendering/column-grid/column-grid-labels';
import type { ColumnGridLayout } from '@/lib/portal-frame/rendering/column-grid/column-grid-layout';
import {
    adjacentGridLineSpans,
    COLUMN_GRID_LINE_KEY,
    formatGridLineSpanLabel,
    isColumnGridLineMeta,
    spanSegment,
} from '@/lib/portal-frame/rendering/column-grid/column-grid-selection';
import type {
    ColumnGridLineMeta,
    ColumnGridSelection,
} from '@/lib/portal-frame/rendering/column-grid/column-grid-selection';

const GRID_LINE_COLOR = 0x9ca3af;
const SELECTED_GRID_LINE_COLOR = 0xf97316;
const SPAN_LINE_COLOR = 0x6b7280;
const TICK_HALF_LENGTH_M = 0.25;
const OVERLAY_NAME = 'column-grid-selection-overlay';

type Point3 = [number, number, number];

function createSolidLine(points: Point3[], color = SPAN_LINE_COLOR): Line {
    const geometry = new BufferGeometry();
    geometry.setAttribute(
        'position',
        new Float32BufferAttribute(points.flat(), 3),
    );

    return new Line(
        geometry,
        new LineBasicMaterial({
            color,
            transparent: true,
            opacity: 0.95,
        }),
    );
}

function addTick(group: Group, center: Point3, direction: Point3): void {
    const length = Math.hypot(direction[0], direction[1], direction[2]);

    if (length === 0) {
        return;
    }

    const half: Point3 = [
        (direction[0] / length) * TICK_HALF_LENGTH_M,
        (direction[1] / length) * TICK_HALF_LENGTH_M,
        (direction[2] / length) * TICK_HALF_LENGTH_M,
    ];

    group.add(
        createSolidLine([
            [center[0] - half[0], center[1] - half[1], center[2] - half[2]],
            [center[0] + half[0], center[1] + half[1], center[2] + half[2]],
        ]),
    );
}

function addSpanCallout(
    group: Group,
    start: Point3,
    end: Point3,
    label: string,
    tickDirection: Point3,
): void {
    group.add(createSolidLine([start, end]));
    addTick(group, start, tickDirection);
    addTick(group, end, tickDirection);

    const sprite = createDimensionLabelSprite(label);
    sprite.position.set(
        (start[0] + end[0]) / 2,
        (start[1] + end[1]) / 2,
        (start[2] + end[2]) / 2,
    );
    group.add(sprite);
}

export function collectColumnGridLines(root: Object3D): Line[] {
    const gridGroup = root.getObjectByName('column-grid');

    if (!gridGroup) {
        return [];
    }

    const lines: Line[] = [];

    gridGroup.traverse((child) => {
        if (!(child instanceof Line)) {
            return;
        }

        if (isColumnGridLineMeta(child.userData[COLUMN_GRID_LINE_KEY])) {
            lines.push(child);
        }
    });

    return lines;
}

export function resolveColumnGridLineSelection(
    intersection: Intersection,
): ColumnGridLineMeta | null {
    const meta = intersection.object.userData[COLUMN_GRID_LINE_KEY];

    return isColumnGridLineMeta(meta) ? meta : null;
}

export function createColumnGridSelectionOverlay(
    layout: ColumnGridLayout,
    selection: ColumnGridSelection,
): Group {
    const group = new Group();
    group.name = OVERLAY_NAME;

    const { previous, next } = adjacentGridLineSpans(
        layout,
        selection.axis,
        selection.index,
    );
    const anchor = { x: selection.anchorX, y: selection.anchorY };
    const tickDirection: Point3 =
        selection.axis === 'x' ? [0, 1, 0] : [1, 0, 0];

    for (const span of [previous, next]) {
        if (!span) {
            continue;
        }

        const [start, end] = spanSegment(layout, selection.axis, span, anchor);

        addSpanCallout(
            group,
            start,
            end,
            formatGridLineSpanLabel(span),
            tickDirection,
        );
    }

    return group;
}

export function removeColumnGridSelectionOverlay(root: Object3D): void {
    const existing = root.getObjectByName(OVERLAY_NAME);

    if (existing) {
        existing.removeFromParent();
    }
}

export function mountColumnGridSelectionOverlay(
    root: Object3D,
    layout: ColumnGridLayout,
    selection: ColumnGridSelection,
): void {
    removeColumnGridSelectionOverlay(root);
    root.add(createColumnGridSelectionOverlay(layout, selection));
}

export function applyColumnGridLineHighlight(
    root: Object3D,
    selection: ColumnGridLineMeta | null,
): void {
    const gridGroup = root.getObjectByName('column-grid');

    if (!gridGroup) {
        return;
    }

    gridGroup.traverse((child) => {
        if (!(child instanceof Line)) {
            return;
        }

        const meta = child.userData[COLUMN_GRID_LINE_KEY];

        if (!isColumnGridLineMeta(meta)) {
            return;
        }

        const material = child.material as LineDashedMaterial;
        const isSelected =
            selection !== null &&
            meta.axis === selection.axis &&
            meta.index === selection.index;

        material.color.setHex(
            isSelected ? SELECTED_GRID_LINE_COLOR : GRID_LINE_COLOR,
        );
        material.opacity = isSelected ? 1 : 0.85;
    });
}
