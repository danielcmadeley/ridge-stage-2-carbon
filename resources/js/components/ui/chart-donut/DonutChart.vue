<script setup lang="ts" generic="T extends Record<string, unknown>">
import type { Component } from 'vue';
import { Donut } from '@unovis/ts';
import { VisDonut, VisSingleContainer } from '@unovis/vue';
import { useMounted } from '@vueuse/core';
import { computed, ref } from 'vue';
import { cn } from '@/lib/utils';
import ChartSingleTooltip from '@/components/ui/chart/ChartSingleTooltip.vue';
import { defaultColors } from '@/components/ui/chart/chart-colors';
import type { BaseChartProps } from '.';

const props = withDefaults(
    defineProps<
        Pick<
            BaseChartProps<T>,
            | 'data'
            | 'colors'
            | 'index'
            | 'margin'
            | 'showLegend'
            | 'showTooltip'
            | 'filterOpacity'
        > & {
            category: keyof T & string;
            type?: 'donut' | 'pie';
            sortFunction?: (a: T, b: T) => number;
            valueFormatter?: (tick: number, i?: number, ticks?: number[]) => string;
            customTooltip?: Component;
            class?: string;
        }
    >(),
    {
        margin: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
        sortFunction: undefined,
        type: 'donut',
        filterOpacity: 0.2,
        showTooltip: true,
        showLegend: false,
    },
);

type Data = T;

const valueFormatter =
    props.valueFormatter ?? ((tick: number) => `${tick.toLocaleString()}`);
const category = computed(() => props.category);
const index = computed(() => props.index);

const isMounted = useMounted();
const activeSegmentKey = ref<string>();
const colors = computed(() => {
    const filtered = props.data.filter((entry) => entry[props.category]);

    return props.colors?.length
        ? props.colors
        : defaultColors(filtered.length);
});

const legendItems = computed(() =>
    props.data.map((item, itemIndex) => ({
        name: String(item[props.index]),
        color: colors.value[itemIndex],
        inactive: false,
    })),
);

const totalValue = computed(() =>
    props.data.reduce(
        (total, entry) => total + Number(entry[props.category] ?? 0),
        0,
    ),
);

const segmentEvents = {
    [Donut.selectors.segment]: {
        click: (
            datum: { data?: Data },
            _event: PointerEvent,
            segmentIndex: number,
            elements: HTMLElement[],
        ) => {
            const key = datum?.data?.[index.value];

            if (key === activeSegmentKey.value) {
                activeSegmentKey.value = undefined;
                elements.forEach((element) => (element.style.opacity = '1'));
            } else {
                activeSegmentKey.value = String(key);
                elements.forEach(
                    (element) => (element.style.opacity = `${props.filterOpacity}`),
                );
                elements[segmentIndex].style.opacity = '1';
            }
        },
    },
};
</script>

<template>
    <div
        :class="cn('flex h-full w-full flex-col justify-center', props.class)"
        :style="{
            margin: `${margin.top}px ${margin.right}px ${margin.bottom}px ${margin.left}px`,
        }"
    >
        <VisSingleContainer
            v-if="isMounted"
            :data="data"
            :margin="margin"
            class="h-full w-full"
        >
            <ChartSingleTooltip
                v-if="showTooltip"
                :selector="Donut.selectors.segment"
                :index="index"
                :value-key="category"
                :items="legendItems"
                :value-formatter="valueFormatter"
                :custom-tooltip="customTooltip"
            />

            <VisDonut
                :value="(datum: Data) => Number(datum[category])"
                :sort-function="sortFunction"
                :color="colors"
                :arc-width="type === 'donut' ? 20 : 0"
                :show-background="false"
                :central-label="
                    type === 'donut' ? valueFormatter(totalValue) : ''
                "
                :events="segmentEvents"
            />
        </VisSingleContainer>
    </div>
</template>
