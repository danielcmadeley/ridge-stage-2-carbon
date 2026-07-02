export { default as DonutChart } from './DonutChart.vue';

import type { Spacing } from '@unovis/ts';

type KeyOf<T> = Extract<keyof T, string>;

export interface BaseChartProps<T extends Record<string, unknown>> {
    data: T[];
    index: KeyOf<T>;
    colors?: string[];
    margin?: Spacing;
    filterOpacity?: number;
    showTooltip?: boolean;
    showLegend?: boolean;
}
