<script setup lang="ts">
import { Button } from '@/components/ui/button';
import type {
    AnalyticalForceMode,
    AnalyticalLoadCase,
} from '@/lib/portal-frame/rendering/three-group';
import {
    DEAD_LOAD_PARTIAL_FACTOR,
    LIVE_LOAD_PARTIAL_FACTOR,
} from '@/types/portal-frame';

const forceMode = defineModel<AnalyticalForceMode>('forceMode', {
    required: true,
});
const loadCase = defineModel<AnalyticalLoadCase>('loadCase', {
    required: true,
});

const loadCaseOptions: { value: AnalyticalLoadCase; label: string }[] = [
    { value: 'unfactored', label: 'Unfactored' },
    { value: 'factored', label: 'Factored (ULS)' },
];

const forceModeOptions: { value: AnalyticalForceMode; label: string }[] = [
    { value: 'shear', label: 'Shear' },
    { value: 'moment', label: 'Moment' },
    { value: 'axial', label: 'Axial' },
];
</script>

<template>
    <div
        class="flex flex-col gap-4"
        role="tabpanel"
        aria-label="Analytical view"
    >
        <p class="text-sm text-muted-foreground">
            Force diagrams and base reactions are shown on the 3D preview.
        </p>

        <div class="grid grid-cols-2 gap-2">
            <Button
                v-for="option in loadCaseOptions"
                :key="option.value"
                type="button"
                size="sm"
                :variant="loadCase === option.value ? 'default' : 'outline'"
                @click="loadCase = option.value"
            >
                {{ option.label }}
            </Button>
        </div>

        <p class="text-xs text-muted-foreground">
            {{
                loadCase === 'factored'
                    ? `Factored: ${DEAD_LOAD_PARTIAL_FACTOR} × (dead + services) + ${LIVE_LOAD_PARTIAL_FACTOR} × live.`
                    : 'Unfactored: characteristic loads without partial factors.'
            }}
        </p>

        <div class="grid grid-cols-3 gap-2">
            <Button
                v-for="option in forceModeOptions"
                :key="option.value"
                type="button"
                size="sm"
                :variant="forceMode === option.value ? 'default' : 'outline'"
                @click="forceMode = option.value"
            >
                {{ option.label }}
            </Button>
        </div>
    </div>
</template>
