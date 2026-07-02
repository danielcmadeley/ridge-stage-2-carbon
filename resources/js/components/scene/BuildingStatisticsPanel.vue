<script setup lang="ts">
import { Ruler } from '@lucide/vue';
import type { BuildingStatistic } from '@/lib/building/building-statistics';

defineProps<{
    statistics: BuildingStatistic[];
}>();
</script>

<template>
    <section
        class="shrink-0 border-b border-sidebar-border/70 px-4 py-4"
        aria-label="Building statistics"
        data-test="building-statistics-panel"
    >
        <div class="flex items-center gap-2">
            <Ruler class="size-4 shrink-0 text-muted-foreground" />
            <h3 class="text-sm font-semibold">Building statistics</h3>
            <div class="h-px flex-1 bg-border" />
        </div>

        <dl class="mt-4 space-y-3">
            <div
                v-for="statistic in statistics"
                :key="statistic.label"
                class="flex items-baseline justify-between gap-4"
            >
                <dt class="text-base font-semibold tabular-nums">
                    {{ statistic.value }}
                </dt>
                <dd class="text-right text-xs text-muted-foreground">
                    {{ statistic.label }}
                </dd>
            </div>
        </dl>
    </section>
</template>
