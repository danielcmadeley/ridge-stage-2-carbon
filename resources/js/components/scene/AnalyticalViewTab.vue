<script setup lang="ts">
import { Button } from '@/components/ui/button';
import type { SupportReactions } from '@/composables/usePortalFrameResults';
import type {
    AnalyticalForceMode,
    AnalyticalLoadCase,
} from '@/lib/portal-frame/rendering/three-group';
import {
    DEAD_LOAD_PARTIAL_FACTOR,
    LIVE_LOAD_PARTIAL_FACTOR,
} from '@/types/portal-frame';

defineProps<{
    baseReactions: SupportReactions | null;
}>();

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
            Force diagrams are shown on the 3D preview.
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

        <div
            v-if="baseReactions"
            class="rounded-md border border-sidebar-border/70 bg-muted/40 px-3 py-2 text-sm"
        >
            <p class="mb-1 font-medium">
                Base reactions (pinned,
                {{ loadCase === 'factored' ? 'factored' : 'unfactored' }})
            </p>
            <div class="grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-0.5">
                <span class="text-muted-foreground"></span>
                <span class="text-muted-foreground">Horizontal</span>
                <span class="text-muted-foreground">Vertical</span>
                <span class="text-muted-foreground">Left</span>
                <span>{{ baseReactions.left.fxKn.toFixed(1) }} kN</span>
                <span>{{ baseReactions.left.fzKn.toFixed(1) }} kN</span>
                <span class="text-muted-foreground">Right</span>
                <span>{{ baseReactions.right.fxKn.toFixed(1) }} kN</span>
                <span>{{ baseReactions.right.fzKn.toFixed(1) }} kN</span>
            </div>
        </div>
    </div>
</template>
