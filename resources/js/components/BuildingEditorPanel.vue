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
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { UseUkMap3dReturn } from '@/composables/useUkMap3d';
import {
    geocodeAddress,
    type GeocodedAddress,
} from '@/lib/geocode-address';
import { buildPortalFrame } from '@/lib/portal-frame';
import {
    defaultBuildingDraft,
    portalFrameBounds,
} from '@/types/custom-building';
import type { ColumnRestraint } from '@/types/portal-frame';
import { rafterLineLoadKnM } from '@/types/portal-frame';

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
const frameError = ref<string | null>(null);
const analyticalView = ref(false);
const analyticalForceMode = ref<'shear' | 'moment'>('moment');

const teamSlug = computed(() => page.props.currentTeam?.slug ?? null);
const placedBuildings = computed(() => props.map.customBuildings.value);
const activePlacedBuilding = computed(() =>
    mapBuildingId.value
        ? placedBuildings.value.find(
              (building) => building.id === mapBuildingId.value,
          ) ?? null
        : null,
);

const resolvedFrame = computed(() => {
    try {
        frameError.value = null;

        return buildPortalFrame(draft.portalFrame);
    } catch (error) {
        frameError.value =
            error instanceof Error
                ? error.message
                : 'Could not resolve portal frame sections.';

        return null;
    }
});

const bounds = computed(() => portalFrameBounds(draft.portalFrame));

watch(
    draft,
    () => {
        if (!mapBuildingId.value) {
            return;
        }

        props.map.updateBuilding(mapBuildingId.value, {
            portalFrame: { ...draft.portalFrame },
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
        portalFrame: { ...draft.portalFrame },
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
        portalFrame: { ...draft.portalFrame },
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

        if (!resolvedFrame.value) {
            throw new Error(frameError.value ?? 'Could not resolve portal frame sections.');
        }

        await exportAndDownloadBuildingIfc(
            teamSlug.value,
            {
                portalFrame: { ...draft.portalFrame },
                rotation: [...draft.rotation],
            },
            {
                name: activePlacedBuilding.value
                    ? `${draft.portalFrame.span}m span portal frame`
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

function updateColumnRestraint(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as ColumnRestraint;
    draft.portalFrame.columnRestraint = value;
    syncDraftToMap();
}
</script>

<template>
    <div class="relative h-full min-h-0 w-full overflow-hidden">
        <div class="pointer-events-auto absolute inset-0">
            <BuildingPreview
                :draft="draft"
                :analytical-view="analyticalView"
                :analytical-force-mode="analyticalForceMode"
            />
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
                    <CardTitle>Portal frame editor</CardTitle>
                    <CardDescription>
                        Configure the portal frame, search for a UK address, then
                        drag it into position on the map.
                    </CardDescription>
                </CardHeader>

                <CardContent
                    class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-4"
                >
                    <div class="grid grid-cols-2 gap-3">
                        <div class="grid gap-2">
                            <Label for="span">Span (m)</Label>
                            <Input
                                id="span"
                                v-model.number="draft.portalFrame.span"
                                type="number"
                                min="1"
                                step="1"
                                @change="syncDraftToMap"
                            />
                        </div>
                        <div class="grid gap-2">
                            <Label for="eaves">Eaves height (m)</Label>
                            <Input
                                id="eaves"
                                v-model.number="draft.portalFrame.eavesHeight"
                                type="number"
                                min="1"
                                step="0.5"
                                @change="syncDraftToMap"
                            />
                        </div>
                        <div class="grid gap-2">
                            <Label for="length">Building length (m)</Label>
                            <Input
                                id="length"
                                v-model.number="draft.portalFrame.buildingLength"
                                type="number"
                                min="1"
                                step="1"
                                @change="syncDraftToMap"
                            />
                        </div>
                        <div class="grid gap-2">
                            <Label for="bay-spacing">Bay spacing (m)</Label>
                            <Input
                                id="bay-spacing"
                                v-model.number="draft.portalFrame.baySpacing"
                                type="number"
                                min="1"
                                step="0.5"
                                @change="syncDraftToMap"
                            />
                        </div>
                        <div class="grid gap-2">
                            <Label for="dead-load">Dead load (kN/m²)</Label>
                            <Input
                                id="dead-load"
                                v-model.number="draft.portalFrame.deadLoadKnM2"
                                type="number"
                                min="0"
                                step="0.05"
                                @change="syncDraftToMap"
                            />
                        </div>
                        <div class="grid gap-2">
                            <Label for="live-load">Live load (kN/m²)</Label>
                            <Input
                                id="live-load"
                                v-model.number="draft.portalFrame.liveLoadKnM2"
                                type="number"
                                min="0"
                                step="0.05"
                                @change="syncDraftToMap"
                            />
                        </div>
                    </div>

                    <div class="grid gap-2">
                        <Label for="column-restraint">Column restraint</Label>
                        <select
                            id="column-restraint"
                            class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                            :value="draft.portalFrame.columnRestraint"
                            @change="updateColumnRestraint"
                        >
                            <option value="restrained">Restrained</option>
                            <option value="unrestrained">Unrestrained</option>
                        </select>
                    </div>

                    <div class="flex items-center gap-2">
                        <Checkbox
                            id="analytical-view"
                            :model-value="analyticalView"
                            @update:model-value="
                                (value) => {
                                    analyticalView = value === true;
                                }
                            "
                        />
                        <Label for="analytical-view" class="font-normal">
                            Analytical view (force diagrams)
                        </Label>
                    </div>

                    <div
                        v-if="analyticalView"
                        class="grid grid-cols-2 gap-2"
                    >
                        <Button
                            type="button"
                            size="sm"
                            :variant="
                                analyticalForceMode === 'shear'
                                    ? 'default'
                                    : 'outline'
                            "
                            @click="analyticalForceMode = 'shear'"
                        >
                            Shear
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            :variant="
                                analyticalForceMode === 'moment'
                                    ? 'default'
                                    : 'outline'
                            "
                            @click="analyticalForceMode = 'moment'"
                        >
                            Moment
                        </Button>
                    </div>

                    <div
                        v-if="resolvedFrame"
                        class="rounded-md border border-sidebar-border/70 bg-muted/40 px-3 py-2 text-sm"
                    >
                        <p>
                            Rafter line load:
                            {{ rafterLineLoadKnM(draft.portalFrame).toFixed(2) }} kN/m
                        </p>
                        <p>Lookup span: {{ resolvedFrame.lookupSpanM }} m</p>
                        <p>Rafter: {{ resolvedFrame.rafter.name }}</p>
                        <p>Column: {{ resolvedFrame.column.name }}</p>
                    </div>

                    <p v-if="frameError" class="text-sm text-destructive">
                        {{ frameError }}
                    </p>

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
                            :disabled="isExporting || !resolvedFrame"
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
                                    {{ building.portalFrame.span }}m span ×
                                    {{ building.portalFrame.buildingLength }}m
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

                    <p class="w-full text-xs text-muted-foreground">
                        Envelope: {{ bounds.width.toFixed(1) }}m ×
                        {{ bounds.depth.toFixed(1) }}m ×
                        {{ bounds.height.toFixed(1) }}m apex
                    </p>
                </CardFooter>
            </Card>
        </aside>
    </div>
</template>
