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
import {
    analyzeGoverningPortalFrame,
    buildPortalFrame,
    calculatePortalFrameCarbon,
    sizeFoundationReactions,
    type CarbonQuantity,
    type FoundationSizingResult,
    type ScorsBand,
} from '@/lib/portal-frame';
import type { AnalyticalForceMode } from '@/lib/portal-frame/three-group';
import {
    defaultBuildingDraft,
    portalFrameBounds,
} from '@/types/custom-building';
import type { ColumnRestraint } from '@/types/portal-frame';
import type { FoundationType } from '@/types/portal-frame';
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
const analyticalForceMode = ref<AnalyticalForceMode>('moment');
const foundationTypeLabels: Record<FoundationType, string> = {
    two_pile_cap: 'Two-pile pile cap',
    reinforced_pad: 'Reinforced pad',
    mass_filled: 'Mass-filled',
};

const baseReactions = computed(() => {
    if (!resolvedFrame.value) {
        return null;
    }

    try {
        return analyzeGoverningPortalFrame(
            resolvedFrame.value,
            draft.portalFrame,
        ).reactions;
    } catch {
        return null;
    }
});

const foundationSizing = computed(() => {
    if (!baseReactions.value) {
        return null;
    }

    return sizeFoundationReactions(
        baseReactions.value,
        draft.portalFrame.foundation,
    );
});
const foundationSizingEntries = computed(() => {
    if (!foundationSizing.value) {
        return [];
    }

    return [
        { side: 'left', result: foundationSizing.value.left },
        { side: 'right', result: foundationSizing.value.right },
    ];
});

const carbon = computed(() => {
    if (!resolvedFrame.value) {
        return null;
    }

    try {
        return calculatePortalFrameCarbon(draft.portalFrame);
    } catch {
        return null;
    }
});

const carbonRows = computed<{ label: string; quantity: CarbonQuantity }[]>(() => {
    if (!carbon.value) {
        return [];
    }

    const { breakdown } = carbon.value;

    return [
        { label: 'Columns', quantity: breakdown.columns },
        { label: 'Gable columns', quantity: breakdown.gableColumns },
        { label: 'Rafters', quantity: breakdown.rafters },
        { label: 'Haunches', quantity: breakdown.haunches },
        { label: 'Eaves ties', quantity: breakdown.ties },
        { label: 'Bracing', quantity: breakdown.braces },
        { label: 'Side rails', quantity: breakdown.sideRails },
        { label: 'Purlins', quantity: breakdown.purlins },
        { label: 'Foundation concrete', quantity: breakdown.concrete },
        { label: 'Foundation rebar', quantity: breakdown.rebar },
        { label: 'Slab concrete', quantity: breakdown.slabConcrete },
        { label: 'Slab rebar', quantity: breakdown.slabRebar },
        { label: 'Connections', quantity: breakdown.connections },
    ];
});

function formatCarbon(carbonKg: number): string {
    if (carbonKg >= 1000) {
        return `${(carbonKg / 1000).toLocaleString(undefined, {
            maximumFractionDigits: 2,
        })} tCO₂e`;
    }

    return `${carbonKg.toLocaleString(undefined, {
        maximumFractionDigits: 0,
    })} kgCO₂e`;
}

function carbonShare(carbonKg: number): number {
    if (!carbon.value || carbon.value.totalCarbonKg <= 0) {
        return 0;
    }

    return (carbonKg / carbon.value.totalCarbonKg) * 100;
}

const scorsBandClasses: Record<ScorsBand, string> = {
    A: 'bg-green-600 text-white',
    B: 'bg-green-500 text-white',
    C: 'bg-lime-500 text-white',
    D: 'bg-yellow-500 text-black',
    E: 'bg-orange-500 text-white',
    F: 'bg-red-500 text-white',
    G: 'bg-red-700 text-white',
};

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

function updateFoundationType(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as FoundationType;
    draft.portalFrame.foundation.type = value;
    syncDraftToMap();
}

function foundationResultStatus(result: FoundationSizingResult): string {
    return result.checks.every((check) => check.passes) ? 'Pass' : 'Review';
}

function maximumUtilisation(result: FoundationSizingResult): number {
    return Math.max(...result.checks.map((check) => check.utilisation));
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
            class="absolute top-4 left-1/2 z-10 -translate-x-1/2 shadow-md lg:left-auto lg:right-[21.5rem] lg:translate-x-0"
            @click="openMap(mapBuildingId ? { flyToId: mapBuildingId } : undefined)"
        >
            <Map class="size-4" />
            View map
        </Button>

        <aside
            v-if="carbon"
            class="absolute top-4 left-4 z-20 flex max-h-[calc(100%-2rem)] w-72 flex-col overflow-hidden rounded-xl border border-sidebar-border/70 bg-background/90 shadow-2xl backdrop-blur-md sm:w-80"
        >
            <Card class="flex min-h-0 flex-1 flex-col gap-0 border-0 bg-transparent py-0 shadow-none">
                <CardHeader class="shrink-0 border-b border-sidebar-border/70 py-4">
                    <div class="flex items-start justify-between gap-2">
                        <div>
                            <CardTitle>Embodied carbon</CardTitle>
                            <CardDescription>
                                A1–A3 estimate from element mass × factor.
                                Includes a 250mm slab with H12 top and bottom at
                                200mm centres, plus 10% steel for connections.
                            </CardDescription>
                        </div>
                        <span
                            class="flex size-9 shrink-0 items-center justify-center rounded-md text-base font-bold"
                            :class="scorsBandClasses[carbon.scorsBand]"
                            :title="`IStructE SCORS band ${carbon.scorsBand}`"
                        >
                            {{ carbon.scorsBand }}
                        </span>
                    </div>
                </CardHeader>

                <CardContent
                    class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-4 text-sm"
                >
                    <div class="grid grid-cols-2 gap-3">
                        <div
                            class="rounded-md border border-sidebar-border/70 bg-muted/40 px-3 py-2"
                        >
                            <p class="text-xs text-muted-foreground">Total</p>
                            <p class="font-semibold">
                                {{ formatCarbon(carbon.totalCarbonKg) }}
                            </p>
                        </div>
                        <div
                            class="rounded-md border border-sidebar-border/70 bg-muted/40 px-3 py-2"
                        >
                            <p class="text-xs text-muted-foreground">Intensity</p>
                            <p class="font-semibold">
                                {{ carbon.carbonIntensityKgM2.toFixed(0) }}
                                kgCO₂e/m²
                            </p>
                            <p class="text-xs text-muted-foreground">
                                over {{ carbon.floorAreaM2.toFixed(0) }} m² GIFA
                            </p>
                        </div>
                    </div>

                    <div class="space-y-1.5">
                        <div
                            v-for="row in carbonRows"
                            :key="row.label"
                            class="grid grid-cols-[1fr_auto] items-center gap-x-3"
                        >
                            <div class="flex items-center justify-between gap-2">
                                <span>{{ row.label }}</span>
                                <span class="text-xs text-muted-foreground">
                                    {{
                                        carbonShare(row.quantity.carbonKg).toFixed(0)
                                    }}%
                                </span>
                            </div>
                            <span class="text-right tabular-nums">
                                {{ formatCarbon(row.quantity.carbonKg) }}
                            </span>
                            <div
                                class="col-span-2 h-1 overflow-hidden rounded-full bg-background/70"
                            >
                                <div
                                    class="h-full rounded-full bg-primary/60"
                                    :style="{
                                        width: `${carbonShare(row.quantity.carbonKg)}%`,
                                    }"
                                />
                            </div>
                        </div>
                    </div>

                    <div
                        class="flex items-center justify-between gap-2 border-t border-sidebar-border/70 pt-2"
                    >
                        <span class="text-muted-foreground">
                            Steel sections subtotal
                        </span>
                        <span class="tabular-nums">
                            {{ formatCarbon(carbon.steelSectionsCarbonKg) }}
                        </span>
                    </div>
                </CardContent>
            </Card>
        </aside>

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
                        class="grid grid-cols-3 gap-2"
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
                        <Button
                            type="button"
                            size="sm"
                            :variant="
                                analyticalForceMode === 'axial'
                                    ? 'default'
                                    : 'outline'
                            "
                            @click="analyticalForceMode = 'axial'"
                        >
                            Axial
                        </Button>
                    </div>

                    <div class="grid gap-2">
                        <Label for="foundation-type">Foundation type</Label>
                        <select
                            id="foundation-type"
                            class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                            :value="draft.portalFrame.foundation.type"
                            @change="updateFoundationType"
                        >
                            <option value="two_pile_cap">
                                Two-pile pile cap
                            </option>
                            <option value="reinforced_pad">
                                Pad foundation with reinforcement
                            </option>
                            <option value="mass_filled">
                                Mass-filled foundation
                            </option>
                        </select>
                    </div>

                    <details
                        class="rounded-md border border-sidebar-border/70 bg-muted/40 px-3 py-2 text-sm"
                    >
                        <summary class="cursor-pointer font-medium">
                            Foundation assumptions
                        </summary>
                        <div class="mt-3 grid grid-cols-2 gap-3">
                            <div class="grid gap-2">
                                <Label for="allowable-bearing">
                                    Bearing (kPa)
                                </Label>
                                <Input
                                    id="allowable-bearing"
                                    v-model.number="
                                        draft.portalFrame.foundation.assumptions
                                            .allowableBearingKpa
                                    "
                                    type="number"
                                    min="1"
                                    step="5"
                                    @change="syncDraftToMap"
                                />
                            </div>
                            <div class="grid gap-2">
                                <Label for="pile-capacity">
                                    Pile capacity (kN)
                                </Label>
                                <Input
                                    id="pile-capacity"
                                    v-model.number="
                                        draft.portalFrame.foundation.assumptions
                                            .pileWorkingCapacityKn
                                    "
                                    type="number"
                                    min="1"
                                    step="10"
                                    @change="syncDraftToMap"
                                />
                            </div>
                            <div
                                v-if="
                                    draft.portalFrame.foundation.type ===
                                    'two_pile_cap'
                                "
                                class="col-span-2 rounded-md border border-sidebar-border/70 bg-background/50 p-2 text-xs text-muted-foreground"
                            >
                                Two-pile caps use two 450 mm diameter piles,
                                6.0 m deep, spaced at 3D = 1.35 m
                                centre-to-centre.
                            </div>
                            <div class="grid gap-2">
                                <Label for="concrete-density">
                                    Concrete (kN/m³)
                                </Label>
                                <Input
                                    id="concrete-density"
                                    v-model.number="
                                        draft.portalFrame.foundation.assumptions
                                            .concreteDensityKnM3
                                    "
                                    type="number"
                                    min="1"
                                    step="0.5"
                                    @change="syncDraftToMap"
                                />
                            </div>
                            <div class="grid gap-2">
                                <Label for="soil-density">
                                    Soil cover (kN/m³)
                                </Label>
                                <Input
                                    id="soil-density"
                                    v-model.number="
                                        draft.portalFrame.foundation.assumptions
                                            .soilCoverDensityKnM3
                                    "
                                    type="number"
                                    min="1"
                                    step="0.5"
                                    @change="syncDraftToMap"
                                />
                            </div>
                            <div class="grid gap-2">
                                <Label for="friction">
                                    Friction coefficient
                                </Label>
                                <Input
                                    id="friction"
                                    v-model.number="
                                        draft.portalFrame.foundation.assumptions
                                            .frictionCoefficient
                                    "
                                    type="number"
                                    min="0.05"
                                    step="0.05"
                                    @change="syncDraftToMap"
                                />
                            </div>
                            <div class="grid gap-2">
                                <Label for="concrete-cover">
                                    Cover (m)
                                </Label>
                                <Input
                                    id="concrete-cover"
                                    v-model.number="
                                        draft.portalFrame.foundation.assumptions
                                            .concreteCoverM
                                    "
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    @change="syncDraftToMap"
                                />
                            </div>
                            <div class="grid gap-2">
                                <Label for="bar-diameter">
                                    Bar dia. (mm)
                                </Label>
                                <Input
                                    id="bar-diameter"
                                    v-model.number="
                                        draft.portalFrame.foundation.assumptions
                                            .preferredBarDiameterMm
                                    "
                                    type="number"
                                    min="6"
                                    step="2"
                                    @change="syncDraftToMap"
                                />
                            </div>
                            <div class="grid gap-2">
                                <Label for="rebar-yield">
                                    Rebar fy (MPa)
                                </Label>
                                <Input
                                    id="rebar-yield"
                                    v-model.number="
                                        draft.portalFrame.foundation.assumptions
                                            .reinforcementYieldStrengthMpa
                                    "
                                    type="number"
                                    min="1"
                                    step="10"
                                    @change="syncDraftToMap"
                                />
                            </div>
                        </div>
                    </details>

                    <div
                        v-if="foundationSizing"
                        class="rounded-md border border-sidebar-border/70 bg-muted/40 px-3 py-2 text-sm"
                    >
                        <p class="font-medium">
                            {{
                                foundationTypeLabels[
                                    draft.portalFrame.foundation.type
                                ]
                            }}
                            sizing
                        </p>
                        <p class="mt-1 text-xs text-muted-foreground">
                            Preliminary sizing from base reactions. Confirm with
                            project geotechnical and code checks.
                        </p>
                        <div class="mt-3 grid gap-3">
                            <div
                                v-for="{ side, result } in foundationSizingEntries"
                                :key="side"
                                class="rounded-md border border-sidebar-border/70 bg-background/50 p-2"
                            >
                                <div class="flex items-center justify-between gap-2">
                                    <p class="font-medium capitalize">
                                        {{ side }} base
                                    </p>
                                    <span
                                        :class="
                                            result.checks.every(
                                                (check) => check.passes,
                                            )
                                                ? 'text-green-600'
                                                : 'text-destructive'
                                        "
                                    >
                                        {{ foundationResultStatus(result) }}
                                        ({{
                                            maximumUtilisation(result).toFixed(2)
                                        }})
                                    </span>
                                </div>
                                <p class="mt-1">
                                    {{ result.dimensions.widthM.toFixed(2) }}m ×
                                    {{ result.dimensions.depthM.toFixed(2) }}m ×
                                    {{ result.dimensions.heightM.toFixed(2) }}m
                                </p>
                                <p v-if="result.reinforcement" class="mt-1">
                                    Rebar:
                                    T{{
                                        result.reinforcement.barDiameterMm.toFixed(0)
                                    }}
                                    @
                                    {{
                                        result.reinforcement.spacingMm.toFixed(0)
                                    }}mm each way
                                </p>
                                <p v-if="result.pileCap" class="mt-1">
                                    Piles:
                                    {{ result.pileCap.pileCount }} ×
                                    {{
                                        (
                                            result.pileCap.pileDiameterM * 1000
                                        ).toFixed(0)
                                    }}mm Ø ×
                                    {{ result.pileCap.pileDepthM.toFixed(1) }}m
                                    deep,
                                    {{ result.pileCap.pileSpacingM.toFixed(2) }}m c/c,
                                    {{
                                        result.pileCap.pileCompressionKn.toFixed(1)
                                    }}kN max
                                </p>
                                <ul class="mt-2 space-y-1 text-xs">
                                    <li
                                        v-for="check in result.checks"
                                        :key="check.label"
                                        class="flex justify-between gap-2"
                                    >
                                        <span>{{ check.label }}</span>
                                        <span>
                                            {{ check.demand.toFixed(1) }} /
                                            {{ check.capacity.toFixed(1) }}
                                            {{ check.unit }}
                                        </span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div
                        v-if="analyticalView && baseReactions"
                        class="rounded-md border border-sidebar-border/70 bg-muted/40 px-3 py-2 text-sm"
                    >
                        <p class="mb-1 font-medium">Base reactions (pinned)</p>
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
