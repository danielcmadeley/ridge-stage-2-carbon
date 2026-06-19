<script setup lang="ts">
import { ref } from 'vue';
import BuildingEditorPanel from '@/components/BuildingEditorPanel.vue';
import { useUkMap3d } from '@/composables/useUkMap3d';

const mapContainerRef = ref<HTMLElement | null>(null);
const map = useUkMap3d(mapContainerRef);
</script>

<template>
    <div
        class="flex h-full min-h-[calc(100vh-8rem)] flex-col gap-4 lg:flex-row"
    >
        <div
            class="relative min-h-[420px] flex-1 overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border"
        >
            <div ref="mapContainerRef" class="absolute inset-0 h-full w-full" />

            <div
                v-if="map.isLoading.value"
                class="absolute inset-0 flex items-center justify-center bg-background/80 text-sm text-muted-foreground"
            >
                Loading map…
            </div>

            <div
                v-else-if="map.error.value"
                class="absolute inset-0 flex items-center justify-center bg-background/80 p-6 text-center text-sm text-destructive"
            >
                {{ map.error.value }}
            </div>
        </div>

        <div class="w-full shrink-0 lg:w-96">
            <BuildingEditorPanel :map="map" />
        </div>
    </div>
</template>
