<script setup lang="ts">
import { computed, ref } from 'vue';
import FoundationCalculationsDialog from '@/components/scene/FoundationCalculationsDialog.vue';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type {
    FoundationSizingBySide,
    FoundationSizingEntry,
    SupportReactions,
} from '@/composables/usePortalFrameResults';
import type { FoundationSizingResult } from '@/lib/portal-frame';
import type {
    FoundationAssumptions,
    FoundationDesign,
    FoundationType,
    PortalFrameDesign,
} from '@/types/portal-frame';

const props = defineProps<{
    foundation: FoundationDesign;
    design: PortalFrameDesign;
    baseReactions: SupportReactions | null;
    foundationSizing: FoundationSizingBySide | null;
    foundationSizingEntries: FoundationSizingEntry[];
}>();

const emit = defineEmits<{
    updateType: [type: FoundationType];
    updateAssumption: [key: keyof FoundationAssumptions, value: number];
}>();

const foundationTypeLabels: Record<FoundationType, string> = {
    two_pile_cap: 'Two-pile pile cap',
    reinforced_pad: 'Reinforced pad',
    mass_filled: 'Mass-filled',
};

const calculationsOpen = ref(false);

const sizingResultLabel = computed(
    () =>
        props.foundationSizingEntries[0]?.result.label ??
        foundationTypeLabels[props.foundation.type],
);

function updateFoundationType(type: FoundationType | null): void {
    if (type) {
        emit('updateType', type);
    }
}

function foundationResultStatus(result: FoundationSizingResult): string {
    return result.checks.every((check) => check.passes) ? 'Pass' : 'Review';
}

function maximumUtilisation(result: FoundationSizingResult): number {
    return Math.max(...result.checks.map((check) => check.utilisation));
}
</script>

<template>
    <div
        class="flex flex-col gap-4"
        role="tabpanel"
        aria-label="Foundation Properties"
    >
        <div class="grid gap-2">
            <Label for="foundation-type">Foundation type</Label>
            <Select
                :model-value="foundation.type"
                @update:model-value="
                    updateFoundationType($event as FoundationType | null)
                "
            >
                <SelectTrigger id="foundation-type" class="w-full">
                    <SelectValue placeholder="Select a foundation type" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="two_pile_cap">
                        Two-pile pile cap
                    </SelectItem>
                    <SelectItem value="reinforced_pad">
                        Pad foundation with reinforcement
                    </SelectItem>
                    <SelectItem value="mass_filled">
                        Mass-filled foundation
                    </SelectItem>
                </SelectContent>
            </Select>
        </div>

        <div
            v-if="foundationSizing"
            class="rounded-md border border-sidebar-border/70 bg-muted/40 px-3 py-2 text-sm"
        >
            <p class="font-medium">{{ sizingResultLabel }} sizing</p>
            <div class="mt-2 grid gap-2">
                <div
                    v-for="{ side, result } in foundationSizingEntries"
                    :key="`${side}-${result.type}`"
                    class="flex items-center justify-between gap-2 rounded-md border border-sidebar-border/70 bg-background/50 p-2"
                >
                    <div>
                        <p class="text-xs text-muted-foreground capitalize">
                            {{ side }} base
                        </p>
                        <p>
                            {{ result.dimensions.widthM.toFixed(2) }}m ×
                            {{ result.dimensions.depthM.toFixed(2) }}m ×
                            {{ result.dimensions.heightM.toFixed(2) }}m
                        </p>
                    </div>
                    <span
                        :class="
                            result.checks.every((check) => check.passes)
                                ? 'text-green-600'
                                : 'text-destructive'
                        "
                    >
                        {{ foundationResultStatus(result) }}
                        ({{ maximumUtilisation(result).toFixed(2) }})
                    </span>
                </div>
            </div>
        </div>
        <p v-else class="text-xs text-muted-foreground">
            Foundation sizing is unavailable until the frame can be resolved.
        </p>

        <Button
            variant="outline"
            :disabled="!foundationSizing"
            @click="calculationsOpen = true"
        >
            See calculations
        </Button>

        <FoundationCalculationsDialog
            v-model:open="calculationsOpen"
            :foundation="foundation"
            :design="design"
            :base-reactions="baseReactions"
            :foundation-sizing-entries="foundationSizingEntries"
            @update-assumption="
                (key, value) => emit('updateAssumption', key, value)
            "
        />
    </div>
</template>
