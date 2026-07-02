import {
    BufferGeometry,
    Float32BufferAttribute,
    Group,
    Line,
    LineBasicMaterial,
    LineDashedMaterial,
    Vector3,
} from 'three';
import {
    createCircleLabelSprite,
    createDimensionLabelSprite,
    GRID_LABEL_SIZE_M,
} from '@/lib/portal-frame/rendering/column-grid/column-grid-labels';
import { columnGridLayout } from '@/lib/portal-frame/rendering/column-grid/column-grid-layout';
import { COLUMN_GRID_LINE_KEY } from '@/lib/portal-frame/rendering/column-grid/column-grid-selection';
import type { ColumnGridLineMeta } from '@/lib/portal-frame/rendering/column-grid/column-grid-selection';
import { formatDimensionM } from '@/lib/portal-frame/rendering/dimension-format';
import type { PortalFrameDesign } from '@/types/portal-frame';

const GRID_LINE_COLOR = 0x9ca3af;
const DIMENSION_LINE_COLOR = 0x6b7280;
const GRID_EXTENSION_M = 5;
const DIMENSION_GAP_M = 1.75;
const TICK_HALF_LENGTH_M = 0.25;

type Point3 = [number, number, number];

function tagGridLine(line: Line, meta: ColumnGridLineMeta): Line {
    line.userData[COLUMN_GRID_LINE_KEY] = meta;

    return line;
}

function createDashedGridLine(points: Point3[]): Line {
    const geometry = new BufferGeometry();
    geometry.setAttribute(
        'position',
        new Float32BufferAttribute(points.flat(), 3),
    );

    const line = new Line(
        geometry,
        new LineDashedMaterial({
            color: GRID_LINE_COLOR,
            dashSize: 0.45,
            gapSize: 0.3,
            transparent: true,
            opacity: 0.85,
        }),
    );

    line.computeLineDistances();

    return line;
}

function createSolidLine(points: Point3[]): Line {
    const geometry = new BufferGeometry();
    geometry.setAttribute(
        'position',
        new Float32BufferAttribute(points.flat(), 3),
    );

    return new Line(
        geometry,
        new LineBasicMaterial({
            color: DIMENSION_LINE_COLOR,
            transparent: true,
            opacity: 0.95,
        }),
    );
}

function addSpriteLabel(
    group: Group,
    text: string,
    position: Point3,
    style: 'grid' | 'dimension',
): void {
    if (typeof document === 'undefined') {
        return;
    }

    const sprite =
        style === 'grid'
            ? createCircleLabelSprite(text)
            : createDimensionLabelSprite(text);

    sprite.position.set(...position);
    group.add(sprite);
}

function addTick(group: Group, center: Point3, direction: Point3): void {
    const half = new Vector3(...direction)
        .normalize()
        .multiplyScalar(TICK_HALF_LENGTH_M);

    group.add(
        createSolidLine([
            [center[0] - half.x, center[1] - half.y, center[2] - half.z],
            [center[0] + half.x, center[1] + half.y, center[2] + half.z],
        ]),
    );
}

function addHorizontalDimension(
    group: Group,
    start: Point3,
    end: Point3,
    offsetY: number,
    label: string,
): void {
    const dimStart: Point3 = [start[0], start[1] + offsetY, 0];
    const dimEnd: Point3 = [end[0], end[1] + offsetY, 0];

    group.add(createSolidLine([start, dimStart]));
    group.add(createSolidLine([end, dimEnd]));
    group.add(createSolidLine([dimStart, dimEnd]));
    addTick(group, dimStart, [0, 1, 0]);
    addTick(group, dimEnd, [0, 1, 0]);

    addSpriteLabel(
        group,
        label,
        [(dimStart[0] + dimEnd[0]) / 2, dimStart[1], 0.05],
        'dimension',
    );
}

function addDepthDimension(
    group: Group,
    start: Point3,
    end: Point3,
    offsetX: number,
    label: string,
): void {
    const dimStart: Point3 = [start[0] + offsetX, start[1], 0];
    const dimEnd: Point3 = [end[0] + offsetX, end[1], 0];

    group.add(createSolidLine([start, dimStart]));
    group.add(createSolidLine([end, dimEnd]));
    group.add(createSolidLine([dimStart, dimEnd]));
    addTick(group, dimStart, [1, 0, 0]);
    addTick(group, dimEnd, [1, 0, 0]);

    addSpriteLabel(
        group,
        label,
        [dimStart[0], (dimStart[1] + dimEnd[1]) / 2, 0.05],
        'dimension',
    );
}

function addVerticalDimension(
    group: Group,
    base: Point3,
    height: number,
    offset: Point3,
    label: string,
): void {
    const top: Point3 = [base[0], base[1], height];
    const dimBase: Point3 = [base[0] + offset[0], base[1] + offset[1], base[2]];
    const dimTop: Point3 = [dimBase[0], dimBase[1], height];

    group.add(createSolidLine([base, dimBase]));
    group.add(createSolidLine([top, dimTop]));
    group.add(createSolidLine([dimBase, dimTop]));
    addTick(group, dimBase, [1, 0, 0]);
    addTick(group, dimTop, [1, 0, 0]);

    addSpriteLabel(
        group,
        label,
        [dimBase[0], dimBase[1], height / 2],
        'dimension',
    );
}

export function createColumnGridGroup(design: PortalFrameDesign): Group {
    const group = new Group();
    group.name = 'column-grid';
    const { xLines, yLines, xLabels, yLabels } = columnGridLayout(design);

    if (xLines.length === 0 || yLines.length === 0) {
        return group;
    }

    const xMin = xLines[0];
    const xMax = xLines[xLines.length - 1];
    const yMin = yLines[0];
    const yMax = yLines[yLines.length - 1];
    const yFrontEnd = yMin - GRID_EXTENSION_M;
    const yRearEnd = yMax + GRID_EXTENSION_M;
    const xLeftEnd = xMin - GRID_EXTENSION_M;
    const xRightEnd = xMax + GRID_EXTENSION_M;

    for (const [index, x] of xLines.entries()) {
        group.add(
            tagGridLine(
                createDashedGridLine([
                    [x, yFrontEnd, 0],
                    [x, yRearEnd, 0],
                ]),
                {
                    axis: 'x',
                    index,
                    label: xLabels[index],
                    coordinate: x,
                },
            ),
        );
    }

    for (const [index, y] of yLines.entries()) {
        group.add(
            tagGridLine(
                createDashedGridLine([
                    [xLeftEnd, y, 0],
                    [xRightEnd, y, 0],
                ]),
                {
                    axis: 'y',
                    index,
                    label: yLabels[index],
                    coordinate: y,
                },
            ),
        );
    }

    xLines.forEach((x, index) => {
        addSpriteLabel(group, xLabels[index], [x, yFrontEnd, 0.05], 'grid');
        addSpriteLabel(group, xLabels[index], [x, yRearEnd, 0.05], 'grid');
    });

    yLines.forEach((y, index) => {
        addSpriteLabel(group, yLabels[index], [xLeftEnd, y, 0.05], 'grid');
        addSpriteLabel(group, yLabels[index], [xRightEnd, y, 0.05], 'grid');
    });

    const spanDimensionOffset = -(
        GRID_LABEL_SIZE_M +
        DIMENSION_GAP_M +
        GRID_EXTENSION_M
    );
    const bayDimensionOffset = -(
        GRID_LABEL_SIZE_M +
        DIMENSION_GAP_M +
        GRID_EXTENSION_M
    );
    const heightDimensionOffset: Point3 = [
        bayDimensionOffset - DIMENSION_GAP_M - GRID_LABEL_SIZE_M,
        spanDimensionOffset - DIMENSION_GAP_M - GRID_LABEL_SIZE_M,
        0,
    ];

    addHorizontalDimension(
        group,
        [xMin, yMin, 0],
        [xMax, yMin, 0],
        spanDimensionOffset,
        formatDimensionM(design.span),
    );

    addDepthDimension(
        group,
        [xMin, yMin, 0],
        [xMin, yMin + design.baySpacing, 0],
        bayDimensionOffset,
        formatDimensionM(design.baySpacing),
    );

    addVerticalDimension(
        group,
        [xMin, yMin, 0],
        design.eavesHeight,
        heightDimensionOffset,
        formatDimensionM(design.eavesHeight),
    );

    return group;
}
