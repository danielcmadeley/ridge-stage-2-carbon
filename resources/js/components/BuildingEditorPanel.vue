<script setup lang="ts">
import { usePage } from '@inertiajs/vue3';
import { Map, Search, Download } from '@lucide/vue';
import { computed, reactive, ref, watch } from 'vue';
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
import {
    geocodeAddress,
    type GeocodedAddress,
} from '@/lib/geocode-address';
import { defaultBuildingDraft } from '@/types/custom-building';

const props = defineProps<{
    map: UseUkMap3dReturn;
    openMap: (options?: { flyToId?: string }) => void;
}>();

const page = usePage();
const draft = reactive(defaultBuildingDraft());
const addressQuery = ref('');
const searchError = ref<string | null>(null);
const isSearching = ref(false);
const searchResults = ref<GeocodedAddress[]>([]);
const mapBuildingId = ref<string | null>(null);
const isExporting = ref(false);
const exportError = ref<string | null>(null);

const teamSlug = computed(() => page.props.currentTeam?.slug ?? null);
const placedBuildings = computed(() => props.map.customBuildings.value);
const activePlacedBuilding = computed(() =>
    mapBuildingId.value
        ? placedBuildings.value.find(
              (building) => building.id === mapBuildingId.value,
          ) ?? null
        : null,
);

watch(
    draft,
    () => {
        if (!mapBuildingId.value) {
            return;
        }

        props.map.updateBuilding(mapBuildingId.value, {
            dimensions: { ...draft.dimensions },
            color: draft.color,
            rotation: [...draft.rotation],
        });
    },
    { deep: true },
);

function syncDraftToMap(): void {
    if (!mapBuildingId.value) {
        return;
    }

    props.map.updateBuilding(mapBuildingId.value, {
        dimensions: { ...draft.dimensions },
        color: draft.color,
        rotation: [...draft.rotation],
    });
}

async function searchAddress(): Promise<void> {
    searchError.value = null;
    searchResults.value = [];

    if (!teamSlug.value) {
        searchError.value = 'Select a team before searching for an address.';

        return;
    }

    const query = addressQuery.value.trim();

    if (query.length < 3) {
        searchError.value = 'Enter at least three characters to search.';

        return;
    }

    isSearching.value = true;

    try {
        const results = await geocodeAddress(teamSlug.value, query);

        if (results.length === 0) {
            searchError.value = 'No matching addresses were found.';

            return;
        }

        searchResults.value = results;

        if (results.length === 1) {
            await placeBuildingAtAddress(results[0]);
        }
    } catch (error) {
        searchError.value =
            error instanceof Error
                ? error.message
                : 'Could not search for that address.';
    } finally {
        isSearching.value = false;
    }
}

async function placeBuildingAtAddress(result: GeocodedAddress): Promise<void> {
    const origin: [number, number] = [result.lng, result.lat];
    const buildingDraft = {
        dimensions: { ...draft.dimensions },
        color: draft.color,
        rotation: [...draft.rotation] as [number, number, number],
    };

    if (mapBuildingId.value) {
        props.map.removeBuilding(mapBuildingId.value);
    }

    const building = props.map.addBuildingAt(buildingDraft, origin);
    mapBuildingId.value = building.id;
    addressQuery.value = result.label;
    searchResults.value = [];

    props.openMap({ flyToId: building.id });
}

function removePlacedBuilding(id: string): void {
    props.map.removeBuilding(id);

    if (mapBuildingId.value === id) {
        mapBuildingId.value = null;
    }
}

async function exportBuilding(): Promise<void> {
    exportError.value = null;
    isExporting.value = true;

    try {
        const { exportAndDownloadBuildingIfc } = await import(
            '@/lib/export-building-ifc'
        );

        if (!teamSlug.value) {
            throw new Error('Select a team before exporting IFC.');
        }

        await exportAndDownloadBuildingIfc(
            teamSlug.value,
            {
                dimensions: { ...draft.dimensions },
                color: draft.color,
                rotation: [...draft.rotation],
            },
            {
                name: activePlacedBuilding.value
                    ? `${activePlacedBuilding.value.dimensions.width}x${activePlacedBuilding.value.dimensions.depth}x${activePlacedBuilding.value.dimensions.height}m building`
                    : undefined,
            },
        );
    } catch (error) {
        exportError.value =
            error instanceof Error
                ? error.message
                : 'Could not export this building as IFC.';
    } finally {
        isExporting.value = false;
    }
}
</script>

<template>
    <div class="relative h-full min-h-0 w-full overflow-hidden">
        <div class="pointer-events-auto absolute inset-0">
            <BuildingPreview :draft="draft" />
        </div>

        <Button
            type="button"
            variant="secondary"
            size="sm"
            class="absolute top-4 left-4 z-10 shadow-md lg:left-auto lg:right-[21.5rem]"
            @click="openMap(mapBuildingId ? { flyToId: mapBuildingId } : undefined)"
        >
            <Map class="size-4" />
            View map
        </Button>

        <aside
            class="absolute top-4 right-4 z-20 flex max-h-[calc(100%-2rem)] w-72 flex-col overflow-hidden rounded-xl border border-sidebar-border/70 bg-background/90 shadow-2xl backdrop-blur-md sm:w-80"
        >
            <Card class="flex min-h-0 flex-1 flex-col gap-0 border-0 bg-transparent py-0 shadow-none">
                <CardHeader class="shrink-0 border-b border-sidebar-border/70 py-4">
                    <CardTitle>Building editor</CardTitle>
                    <CardDescription>
                        Design your building, search for a UK address, then drag
                        it into position on the map.
                    </CardDescription>
                </CardHeader>

                <CardContent
                    class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-4"
                >
                    <div class="grid grid-cols-3 gap-3">
                        <div class="grid gap-2">
                            <Label for="width">Width (m)</Label>
                            <Input
                                id="width"
                                v-model.number="draft.dimensions.width"
                                type="number"
                                min="1"
                                step="1"
                                @change="syncDraftToMap"
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
                                @change="syncDraftToMap"
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
                                @change="syncDraftToMap"
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
                            @change="syncDraftToMap"
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
                                @change="syncDraftToMap"
                            />
                        </div>
                        <div class="grid gap-2">
                            <Label for="rotation-y">Rotation Y (rad)</Label>
                            <Input
                                id="rotation-y"
                                v-model.number="draft.rotation[1]"
                                type="number"
                                step="0.1"
                                @change="syncDraftToMap"
                            />
                        </div>
                        <div class="grid gap-2">
                            <Label for="rotation-z">Rotation Z (rad)</Label>
                            <Input
                                id="rotation-z"
                                v-model.number="draft.rotation[2]"
                                type="number"
                                step="0.1"
                                @change="syncDraftToMap"
                            />
                        </div>
                    </div>

                    <div class="grid gap-2">
                        <Button
                            type="button"
                            class="w-full"
                            variant="outline"
                            :disabled="isExporting"
                            @click="exportBuilding"
                        >
                            <Download class="size-4" />
                            {{ isExporting ? 'Exporting IFC…' : 'Export IFC' }}
                        </Button>

                        <p
                            v-if="exportError"
                            class="text-sm text-destructive"
                        >
                            {{ exportError }}
                        </p>
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
                                    @click="openMap({ flyToId: building.id })"
                                >
                                    {{ building.dimensions.width }}×{{
                                        building.dimensions.depth
                                    }}×{{ building.dimensions.height }}m
                                </button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    @click="removePlacedBuilding(building.id)"
                                >
                                    Remove
                                </Button>
                            </li>
                        </ul>
                    </div>
                </CardContent>

                <CardFooter
                    class="shrink-0 flex-col gap-3 border-t border-sidebar-border/70 py-4"
                >
                    <div class="grid w-full gap-2">
                        <Label for="address">Postcode or address</Label>
                        <Input
                            id="address"
                            v-model="addressQuery"
                            placeholder="e.g. SW1A 1AA or 10 Downing Street"
                            @keydown.enter.prevent="searchAddress"
                        />
                    </div>

                    <p
                        v-if="searchError"
                        class="w-full text-sm text-destructive"
                    >
                        {{ searchError }}
                    </p>

                    <ul
                        v-if="searchResults.length > 1"
                        class="max-h-40 w-full space-y-2 overflow-y-auto"
                    >
                        <li
                            v-for="(result, index) in searchResults"
                            :key="`${result.lng}-${result.lat}-${index}`"
                        >
                            <button
                                type="button"
                                class="w-full rounded-md border border-sidebar-border/70 px-3 py-2 text-left text-sm hover:bg-muted"
                                @click="placeBuildingAtAddress(result)"
                            >
                                {{ result.label }}
                            </button>
                        </li>
                    </ul>

                    <Button
                        class="w-full"
                        :disabled="isSearching"
                        @click="searchAddress"
                    >
                        <Search class="size-4" />
                        {{ isSearching ? 'Searching…' : 'Find on map' }}
                    </Button>
                </CardFooter>
            </Card>
        </aside>
    </div>
</template>
