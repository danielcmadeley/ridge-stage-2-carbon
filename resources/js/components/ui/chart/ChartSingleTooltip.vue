<script setup lang="ts">
import type { BulletLegendItemInterface } from '@unovis/ts';
import type { Component } from 'vue';
import { omit } from '@unovis/ts';
import { VisTooltip } from '@unovis/vue';
import { createApp } from 'vue';
import ChartTooltip from './ChartTooltip.vue';
import { resolveChartTooltipDatum } from './chart-single-tooltip';

const props = defineProps<{
    selector: string;
    index: string;
    valueKey?: string;
    items?: BulletLegendItemInterface[];
    valueFormatter?: (tick: number, i?: number, ticks?: number[]) => string;
    customTooltip?: Component;
}>();

const wm = new WeakMap<object, string>();

function template(
    d: Record<string, unknown>,
    i: number,
    elements: (HTMLElement | SVGElement)[],
): string {
    const valueFormatter =
        props.valueFormatter ?? ((tick: number) => `${tick}`);
    const valueKey = props.valueKey ?? props.index;
    const record = resolveChartTooltipDatum(d);

    if (props.index in record) {
        if (wm.has(record)) {
            return wm.get(record)!;
        }

        const componentDiv = document.createElement('div');
        const omittedData = Object.entries(omit(record, [props.index])).map(
            ([key, value]) => {
                const legendReference = props.items?.find(
                    (item) => item.name === key,
                );

                return {
                    name: key,
                    color: legendReference?.color ?? 'currentColor',
                    value: valueFormatter(Number(value)),
                };
            },
        );
        const TooltipComponent = props.customTooltip ?? ChartTooltip;

        createApp(TooltipComponent, {
            title: String(record[props.index]),
            data: omittedData,
        }).mount(componentDiv);
        wm.set(record, componentDiv.innerHTML);

        return componentDiv.innerHTML;
    }

    if (wm.has(record)) {
        return wm.get(record)!;
    }

    const style = getComputedStyle(elements[i]);
    const omittedData = [
        {
            name: String(record[props.index] ?? record.name),
            value: valueFormatter(Number(record[valueKey])),
            color: style.fill,
        },
    ];
    const componentDiv = document.createElement('div');
    const TooltipComponent = props.customTooltip ?? ChartTooltip;

    createApp(TooltipComponent, {
        title: String(record[props.index] ?? record.name),
        data: omittedData,
    }).mount(componentDiv);
    wm.set(record, componentDiv.innerHTML);

    return componentDiv.innerHTML;
}
</script>

<template>
    <VisTooltip
        :horizontal-shift="20"
        :vertical-shift="20"
        :triggers="{
            [selector]: template,
        }"
    />
</template>
