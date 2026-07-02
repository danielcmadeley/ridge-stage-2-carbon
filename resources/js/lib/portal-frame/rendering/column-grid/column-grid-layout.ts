import { gableColumnXPositions } from '@/lib/portal-frame/model/gable-columns';
import type { PortalFrameDesign } from '@/types/portal-frame';

export type ColumnGridLayout = {
    xLines: number[];
    yLines: number[];
    xLabels: string[];
    yLabels: string[];
};

export function gridLetterLabel(index: number): string {
    let label = '';
    let remaining = index;

    while (remaining >= 0) {
        label = String.fromCharCode(65 + (remaining % 26)) + label;
        remaining = Math.floor(remaining / 26) - 1;
    }

    return label;
}

export function columnGridLayout(design: PortalFrameDesign): ColumnGridLayout {
    const bayCount = Math.max(
        1,
        Math.round(design.buildingLength / design.baySpacing),
    );
    const frameCount = bayCount + 1;
    const xLines = gableColumnXPositions(design.span);
    const yLines = Array.from(
        { length: frameCount },
        (_, index) => index * design.baySpacing,
    );

    return {
        xLines,
        yLines,
        xLabels: xLines.map((_, index) => gridLetterLabel(index)),
        yLabels: yLines.map((_, index) => String(index + 1)),
    };
}
