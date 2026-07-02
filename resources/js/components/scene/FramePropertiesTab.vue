<script setup lang="ts">
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import type { BuiltPortalFrame } from '@/lib/portal-frame/model/geometry-builder';
import type { ColumnRestraint, PortalFrameDesign } from '@/types/portal-frame';
import {
    DEAD_LOAD_PARTIAL_FACTOR,
    factoredRafterLineLoadKnM,
    LIVE_LOAD_PARTIAL_FACTOR,
    permanentLoadKnM2,
    rafterLineLoadKnM,
} from '@/types/portal-frame';

export type PortalFrameDimensionKey =
    | 'span'
    | 'eavesHeight'
    | 'buildingLength'
    | 'baySpacing';

export type PortalFrameLoadKey =
    | 'deadLoadKnM2'
    | 'servicesLoadKnM2'
    | 'liveLoadKnM2';

defineProps<{
    design: PortalFrameDesign;
    resolvedFrame: BuiltPortalFrame | null;
    frameError: string | null;
}>();

const emit = defineEmits<{
    updateDimension: [key: PortalFrameDimensionKey, value: number];
    updateLoad: [key: PortalFrameLoadKey, value: number];
    updateColumnRestraint: [value: ColumnRestraint];
}>();

const dimensionFields: {
    key: PortalFrameDimensionKey;
    label: string;
    min: number;
    max: number;
    step: number;
}[] = [
    { key: 'span', label: 'Span (m)', min: 6, max: 48, step: 1 },
    {
        key: 'eavesHeight',
        label: 'Eaves height (m)',
        min: 3,
        max: 15,
        step: 0.5,
    },
    {
        key: 'buildingLength',
        label: 'Building length (m)',
        min: 10,
        max: 120,
        step: 1,
    },
    {
        key: 'baySpacing',
        label: 'Bay spacing (m)',
        min: 3,
        max: 10,
        step: 0.5,
    },
];

const loadFields: { id: string; label: string; key: PortalFrameLoadKey }[] = [
    { id: 'dead-load', label: 'Dead (kN/m²)', key: 'deadLoadKnM2' },
    { id: 'services-load', label: 'Services (kN/m²)', key: 'servicesLoadKnM2' },
    { id: 'live-load', label: 'Live (kN/m²)', key: 'liveLoadKnM2' },
];

function emitDimension(
    key: PortalFrameDimensionKey,
    value: number[] | undefined,
): void {
    if (!value?.length) {
        return;
    }

    emit('updateDimension', key, value[0]);
}

function emitLoad(key: PortalFrameLoadKey, value: string | number): void {
    const parsed = typeof value === 'number' ? value : Number(value);

    if (!Number.isFinite(parsed)) {
        return;
    }

    emit('updateLoad', key, parsed);
}

function emitColumnRestraint(event: Event): void {
    emit(
        'updateColumnRestraint',
        (event.target as HTMLSelectElement).value as ColumnRestraint,
    );
}
</script>

<template>
    <div
        class="flex flex-col gap-4"
        role="tabpanel"
        aria-label="Frame Properties"
    >
        <div class="space-y-4">
            <div
                v-for="field in dimensionFields"
                :key="field.key"
                class="grid gap-2"
            >
                <div class="flex items-center justify-between gap-2">
                    <Label :for="field.key">{{ field.label }}</Label>
                    <span class="text-sm text-muted-foreground tabular-nums">
                        {{ design[field.key] }}
                    </span>
                </div>
                <Slider
                    :id="field.key"
                    :model-value="[design[field.key]]"
                    :min="field.min"
                    :max="field.max"
                    :step="field.step"
                    @update:model-value="
                        (value) => emitDimension(field.key, value)
                    "
                />
            </div>
        </div>

        <div class="grid grid-cols-3 gap-3">
            <div v-for="field in loadFields" :key="field.id" class="grid gap-2">
                <Label :for="field.id">{{ field.label }}</Label>
                <Input
                    :id="field.id"
                    :model-value="design[field.key]"
                    type="number"
                    min="0"
                    step="0.05"
                    @update:model-value="(value) => emitLoad(field.key, value)"
                />
            </div>
        </div>

        <div
            v-if="resolvedFrame"
            class="rounded-md border border-sidebar-border/70 bg-muted/40 px-3 py-2 text-xs"
        >
            <p class="font-medium">Load factoring (EC0 ULS)</p>
            <dl class="mt-1 grid grid-cols-[auto_1fr_auto] gap-x-2 gap-y-0.5">
                <dt>Permanent</dt>
                <dd class="text-muted-foreground">
                    dead + services =
                    {{ permanentLoadKnM2(design).toFixed(2) }}
                    kN/m²
                </dd>
                <dd class="tabular-nums">
                    ×{{ DEAD_LOAD_PARTIAL_FACTOR.toFixed(2) }} =
                    {{
                        (
                            permanentLoadKnM2(design) * DEAD_LOAD_PARTIAL_FACTOR
                        ).toFixed(2)
                    }}
                </dd>
                <dt>Variable</dt>
                <dd class="text-muted-foreground">
                    live =
                    {{ design.liveLoadKnM2.toFixed(2) }}
                    kN/m²
                </dd>
                <dd class="tabular-nums">
                    ×{{ LIVE_LOAD_PARTIAL_FACTOR.toFixed(2) }} =
                    {{
                        (
                            design.liveLoadKnM2 * LIVE_LOAD_PARTIAL_FACTOR
                        ).toFixed(2)
                    }}
                </dd>
                <dt class="font-medium">Factored</dt>
                <dd></dd>
                <dd class="font-medium tabular-nums">
                    {{
                        (
                            permanentLoadKnM2(design) *
                                DEAD_LOAD_PARTIAL_FACTOR +
                            design.liveLoadKnM2 * LIVE_LOAD_PARTIAL_FACTOR
                        ).toFixed(2)
                    }}
                    kN/m²
                </dd>
            </dl>
        </div>

        <div class="grid gap-2">
            <Label for="column-restraint">Column restraint</Label>
            <select
                id="column-restraint"
                class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                :value="design.columnRestraint"
                @change="emitColumnRestraint"
            >
                <option value="restrained">Restrained</option>
                <option value="unrestrained">Unrestrained</option>
            </select>
        </div>

        <div
            v-if="resolvedFrame"
            class="rounded-md border border-sidebar-border/70 bg-muted/40 px-3 py-2 text-sm"
        >
            <p>
                Rafter line load (characteristic):
                {{ rafterLineLoadKnM(design).toFixed(2) }}
                kN/m
            </p>
            <p>
                Rafter line load (factored):
                {{ factoredRafterLineLoadKnM(design).toFixed(2) }}
                kN/m (used for section lookup)
            </p>
            <p>
                Lookup span:
                {{ resolvedFrame.lookupSpanM }} m
            </p>
            <p>Rafter: {{ resolvedFrame.rafter.name }}</p>
            <p>Column: {{ resolvedFrame.column.name }}</p>
        </div>

        <p v-if="frameError" class="text-sm text-destructive">
            {{ frameError }}
        </p>
    </div>
</template>
