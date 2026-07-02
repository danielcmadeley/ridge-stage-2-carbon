<script setup lang="ts">
import type { BulletLegendItemInterface } from '@unovis/ts';
import type { Component } from 'vue';
import { omit } from '@unovis/ts';
import { VisTooltip } from '@unovis/vue';
import { createApp } from 'vue';
import ChartTooltip from './ChartTooltip.vue';

const props = defineProps<{
    selector: string;
    index: string;
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

    if (props.index in d) {
        if (wm.has(d)) {
            return wm.get(d)!;
        }

        const componentDiv = document.createElement('div');
        const omittedData = Object.entries(omit(d, [props.index])).map(
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
            title: String(d[props.index]),
            data: omittedData,
        }).mount(componentDiv);
        wm.set(d, componentDiv.innerHTML);

        return componentDiv.innerHTML;
    }

    const data = d.data as Record<string, unknown>;

    if (wm.has(data)) {
        return wm.get(data)!;
    }

    const style = getComputedStyle(elements[i]);
    const omittedData = [
        {
            name: String(data.name ?? data[props.index]),
            value: valueFormatter(Number(data[props.index])),
            color: style.fill,
        },
    ];
    const componentDiv = document.createElement('div');
    const TooltipComponent = props.customTooltip ?? ChartTooltip;

    createApp(TooltipComponent, {
        title: String(d[props.index] ?? data.name),
        data: omittedData,
    }).mount(componentDiv);
    wm.set(data, componentDiv.innerHTML);

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
