<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import BuildingEditorPanel from '@/components/scene/BuildingEditorPanel.vue';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useUkMap3d } from '@/composables/useUkMap3d';
import { customBuildingFromServer } from '@/types/custom-building';
import type { ServerProject } from '@/types/scene';

const props = withDefaults(
    defineProps<{
        projects?: ServerProject[];
        focusBuildingSlug?: string | null;
        focusSchemeId?: number | null;
    }>(),
    {
        projects: () => [],
        focusBuildingSlug: null,
        focusSchemeId: null,
    },
);

function schemeIdForBuilding(
    building: NonNullable<ServerProject['buildings']>[number],
): number | null | undefined {
    if (props.focusBuildingSlug && building.slug === props.focusBuildingSlug) {
        return props.focusSchemeId;
    }

    return undefined;
}

const initialBuildings = (props.projects ?? []).flatMap((project) =>
    (project.buildings ?? []).map((building) =>
        customBuildingFromServer(
            building,
            project.slug,
            schemeIdForBuilding(building),
        ),
    ),
);

const mapContainerRef = ref<HTMLElement | null>(null);
const map = useUkMap3d(mapContainerRef, initialBuildings);
const mapOpen = ref(false);
const pendingFlyToId = ref<string | null>(null);

function openMap(options?: { flyToId?: string }): void {
    if (options?.flyToId) {
        pendingFlyToId.value = options.flyToId;
    }

    mapOpen.value = true;
}

watch(mapOpen, async (open) => {
    if (!open) {
        pendingFlyToId.value = null;

        return;
    }

    await nextTick();
    map.resize();
});

watch(
    () => [mapOpen.value, map.isLoading.value] as const,
    async ([open, loading]) => {
        if (!open || loading) {
            return;
        }

        await nextTick();
        map.resize();

        if (pendingFlyToId.value) {
            map.flyToBuilding(pendingFlyToId.value);
            pendingFlyToId.value = null;
        }
    },
);
</script>

<template>
    <div class="relative h-svh min-h-0 w-full">
        <BuildingEditorPanel
            :map="map"
            :open-map="openMap"
            :projects="props.projects"
            :focus-building-slug="props.focusBuildingSlug"
            :focus-scheme-id="props.focusSchemeId"
        />

        <Dialog v-model:open="mapOpen">
            <DialogContent
                class="flex h-[90vh] max-w-[calc(100%-2rem)] flex-col gap-4 p-4 sm:max-w-6xl"
            >
                <DialogHeader>
                    <DialogTitle>Map view</DialogTitle>
                    <DialogDescription>
                        Drag your building to position it on site. Zoom to city
                        level (15+) and pitch the map to see terrain and OSM
                        building extrusions.
                    </DialogDescription>
                </DialogHeader>

                <div
                    v-if="mapOpen"
                    class="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-sidebar-border/70 dark:border-sidebar-border"
                >
                    <div
                        ref="mapContainerRef"
                        class="absolute inset-0 h-full w-full"
                    />

                    <div
                        class="pointer-events-none absolute bottom-3 left-3 z-10 rounded-md bg-background/90 px-3 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur-sm"
                    >
                        Click and drag your building to move it
                    </div>

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
            </DialogContent>
        </Dialog>
    </div>
</template>
