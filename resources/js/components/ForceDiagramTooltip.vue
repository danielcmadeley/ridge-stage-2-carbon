<script setup lang="ts">
import type { ForceDiagramHoverInfo } from '@/lib/portal-frame/force-diagram-hover';

defineProps<{
    info: ForceDiagramHoverInfo;
}>();
</script>

<template>
    <div
        class="pointer-events-none absolute z-10 min-w-40 rounded-md border border-sidebar-border/70 bg-background/95 px-3 py-2 text-xs shadow-md backdrop-blur-sm"
        :style="{
            left: `${info.clientX + 12}px`,
            top: `${info.clientY + 12}px`,
        }"
    >
        <p class="font-medium text-foreground">{{ info.memberLabel }}</p>
        <p class="mt-1 text-muted-foreground">
            Distance
            <span class="text-foreground">{{ info.stationM.toFixed(2) }} m</span>
        </p>
        <p class="text-muted-foreground">
            {{ info.forceLabel }}
            <span class="text-foreground">{{ info.formattedValue }}</span>
        </p>
    </div>
</template>
