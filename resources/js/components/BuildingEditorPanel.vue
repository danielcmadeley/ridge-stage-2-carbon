<script setup lang="ts">
import { computed, reactive } from 'vue';
import BuildingPreview from '@/components/BuildingPreview.vue';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { UseUkMap3dReturn } from '@/composables/useUkMap3d';
import { defaultBuildingDraft } from '@/types/custom-building';

const props = defineProps<{
    map: UseUkMap3dReturn;
}>();

const draft = reactive(defaultBuildingDraft());

const placedBuildings = computed(() => props.map.customBuildings.value);

function placeOnMap(): void {
    props.map.addBuilding({
        dimensions: { ...draft.dimensions },
        color: draft.color,
        rotation: [...draft.rotation],
    });
}
</script>

<template>
    <Card class="flex h-full flex-col gap-0 py-0">
        <CardHeader class="border-b border-sidebar-border/70 py-4">
            <CardTitle>Building editor</CardTitle>
            <CardDescription>
                Preview your building, then place it at the current map centre.
                Zoom to city level (15+) and pitch the map to see terrain and OSM
                building extrusions.
            </CardDescription>
        </CardHeader>

        <CardContent class="flex flex-1 flex-col gap-4 overflow-y-auto py-4">
            <div
                class="relative h-56 overflow-hidden rounded-lg border border-sidebar-border/70 md:h-64"
            >
                <BuildingPreview :draft="draft" />
            </div>

            <div class="grid grid-cols-3 gap-3">
                <div class="grid gap-2">
                    <Label for="width">Width (m)</Label>
                    <Input
                        id="width"
                        v-model.number="draft.dimensions.width"
                        type="number"
                        min="1"
                        step="1"
                    />
                </div>
                <div class="grid gap-2">
                    <Label for="depth">Depth (m)</Label>
                    <Input
                        id="depth"
                        v-model.number="draft.dimensions.depth"
                        type="number"
                        min="1"
                        step="1"
                    />
                </div>
                <div class="grid gap-2">
                    <Label for="height">Height (m)</Label>
                    <Input
                        id="height"
                        v-model.number="draft.dimensions.height"
                        type="number"
                        min="1"
                        step="1"
                    />
                </div>
            </div>

            <div class="grid gap-2">
                <Label for="color">Color</Label>
                <Input
                    id="color"
                    v-model="draft.color"
                    type="color"
                    class="h-10 cursor-pointer p-1"
                />
            </div>

            <div class="grid grid-cols-3 gap-3">
                <div class="grid gap-2">
                    <Label for="rotation-x">Rotation X (rad)</Label>
                    <Input
                        id="rotation-x"
                        v-model.number="draft.rotation[0]"
                        type="number"
                        step="0.1"
                    />
                </div>
                <div class="grid gap-2">
                    <Label for="rotation-y">Rotation Y (rad)</Label>
                    <Input
                        id="rotation-y"
                        v-model.number="draft.rotation[1]"
                        type="number"
                        step="0.1"
                    />
                </div>
                <div class="grid gap-2">
                    <Label for="rotation-z">Rotation Z (rad)</Label>
                    <Input
                        id="rotation-z"
                        v-model.number="draft.rotation[2]"
                        type="number"
                        step="0.1"
                    />
                </div>
            </div>

            <div v-if="placedBuildings.length > 0" class="grid gap-2">
                <Label>Placed buildings</Label>
                <ul class="space-y-2">
                    <li
                        v-for="building in placedBuildings"
                        :key="building.id"
                        class="flex items-center justify-between rounded-md border border-sidebar-border/70 px-3 py-2 text-sm"
                    >
                        <button
                            type="button"
                            class="text-left hover:underline"
                            @click="map.flyToBuilding(building.id)"
                        >
                            {{ building.dimensions.width }}×{{
                                building.dimensions.depth
                            }}×{{ building.dimensions.height }}m
                        </button>
                        <Button
                            variant="ghost"
                            size="sm"
                            @click="map.removeBuilding(building.id)"
                        >
                            Remove
                        </Button>
                    </li>
                </ul>
            </div>
        </CardContent>

        <CardFooter class="border-t border-sidebar-border/70 py-4">
            <Button class="w-full" @click="placeOnMap">
                Place on map
            </Button>
        </CardFooter>
    </Card>
</template>
