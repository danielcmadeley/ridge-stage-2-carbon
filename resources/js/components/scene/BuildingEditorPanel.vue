<script setup lang="ts">
import { router, usePage } from '@inertiajs/vue3';
import {
    ChevronLeft,
    ChevronRight,
    Download,
    Layers,
    Leaf,
    LineChart,
    Map,
    MapPin,
    Save,
    SlidersHorizontal,
} from '@lucide/vue';
import { useMediaQuery, useMounted } from '@vueuse/core';
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { toast } from 'vue-sonner';
import AnalyticalViewTab from '@/components/scene/AnalyticalViewTab.vue';
import BuildingPreview from '@/components/scene/BuildingPreview.vue';
import BuildingStatisticsPanel from '@/components/scene/BuildingStatisticsPanel.vue';
import EmbodiedCarbonPanel from '@/components/scene/EmbodiedCarbonPanel.vue';
import FoundationPropertiesTab from '@/components/scene/FoundationPropertiesTab.vue';
import FramePropertiesTab from '@/components/scene/FramePropertiesTab.vue';
import type {
    PortalFrameDimensionKey,
    PortalFrameLoadKey,
} from '@/components/scene/FramePropertiesTab.vue';
import LocationTab from '@/components/scene/LocationTab.vue';
import type { RotationAxis } from '@/components/scene/LocationTab.vue';
import OnboardingDialog from '@/components/scene/OnboardingDialog.vue';
import type { OnboardingCreatePayload } from '@/components/scene/OnboardingDialog.vue';
import SaveBuildingDialog from '@/components/scene/SaveBuildingDialog.vue';
import ScenePanel from '@/components/scene/ScenePanel.vue';
import SceneToolbar from '@/components/scene/SceneToolbar.vue';
import SchemeSwitcher from '@/components/scene/SchemeSwitcher.vue';
import TypstPdfPreviewDialog from '@/components/scene/TypstPdfPreviewDialog.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAddressSearch } from '@/composables/useAddressSearch';
import { useNearbySurroundings } from '@/composables/useNearbySurroundings';
import { usePortalFrameResults } from '@/composables/usePortalFrameResults';
import { useTypstPdfExport } from '@/composables/useTypstPdfExport';
import type { UseUkMap3dReturn } from '@/composables/useUkMap3d';
import {
    buildBuildingStatistics,
    findPersistedBuildingContext,
    formatBuildingLocationLabel,
} from '@/lib/building/building-statistics';
import type { SaveSchemeInput } from '@/lib/building/save-scheme';
import type { GeocodedAddress } from '@/lib/map/geocode-address';
import type {
    AnalyticalForceMode,
    AnalyticalLoadCase,
} from '@/lib/portal-frame/rendering/three-group';
import { buildCarbonReportTypstSource } from '@/lib/report/typst-carbon-report';
import { deepToRaw } from '@/lib/utils';
import {
    defaultBuildingDraft,
    findInitialCustomBuilding,
    isPlacedOnMap,
    portalFrameBounds,
} from '@/types/custom-building';
import type {
    BuildingPersistence,
    BuildingRotation,
    CustomBuilding,
} from '@/types/custom-building';
import type { ColumnRestraint } from '@/types/portal-frame';
import type { PortalFrameDesign } from '@/types/portal-frame';
import type {
    FoundationAssumptions,
    FoundationType,
} from '@/types/portal-frame';
import { normalizePortalFrameDesign } from '@/types/portal-frame';
import type { ServerProject, ServerScheme } from '@/types/scene';

const props = withDefaults(
    defineProps<{
        map: UseUkMap3dReturn;
        openMap: (options?: { flyToId?: string }) => void;
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

const page = usePage();
const draft = reactive(defaultBuildingDraft());
const {
    query: addressQuery,
    results: searchResults,
    error: searchError,
    isSearching,
    search: searchAddress,
} = useAddressSearch({
    teamSlug: () => teamSlug.value,
    missingTeamMessage: 'Select a team before searching for an address.',
    onSingleResult: (result) => placeBuildingAtAddress(result),
});
const mapBuildingId = ref<string | null>(null);
const isExporting = ref(false);
const analyticalView = ref(false);
const analyticalForceMode = ref<AnalyticalForceMode>('moment');
const analyticalLoadCase = ref<AnalyticalLoadCase>('unfactored');
const carbonPanelOpen = ref(true);
const editorPanelOpen = ref(true);
const isMobileViewport = useMediaQuery('(max-width: 768px)');
// SSR renders `false` for media queries; defer to the client value only after
// mount so the hydration render matches the server markup.
const isMounted = useMounted();
const isMobile = computed(() => isMounted.value && isMobileViewport.value);
type EditorTab = 'frame' | 'analytical' | 'foundation' | 'location';

const editorTabs: {
    id: EditorTab;
    label: string;
    icon: typeof SlidersHorizontal;
}[] = [
    { id: 'frame', label: 'Frame properties', icon: SlidersHorizontal },
    { id: 'analytical', label: 'Analytical view', icon: LineChart },
    { id: 'foundation', label: 'Foundation properties', icon: Layers },
    { id: 'location', label: 'Location', icon: MapPin },
];

const activeTab = ref<EditorTab>('frame');

watch(activeTab, (tab) => {
    analyticalView.value = tab === 'analytical';
});
const saveDialogOpen = ref(false);

const {
    resolvedFrame,
    frameError,
    baseReactions,
    foundationSizing,
    foundationSizingEntries,
    carbon,
} = usePortalFrameResults(() => draft.portalFrame);

const carbonReportExport = useTypstPdfExport({
    buildSource: (paperSize) => {
        if (!carbon.value || !resolvedFrame.value) {
            throw new Error('Carbon data is not available.');
        }

        return buildCarbonReportTypstSource({
            carbon: carbon.value,
            design: draft.portalFrame,
            frame: resolvedFrame.value,
            paperSize,
            foundationSizing: foundationSizing.value,
        });
    },
    downloadFilename: 'portal-frame-carbon-report.pdf',
});

const {
    paperSize: carbonReportPaperSize,
    pdfPreviewOpen: carbonReportPreviewOpen,
    pdfPreviewUrl: carbonReportPreviewUrl,
    isPreviewingPdf: isCarbonReportPreviewing,
    error: carbonReportError,
    previewPdf: previewCarbonReport,
    confirmDownload: downloadCarbonReport,
    handlePdfPreviewOpenChange: handleCarbonReportPreviewOpenChange,
} = carbonReportExport;

function updatePortalFrameDimension(
    key: PortalFrameDimensionKey,
    value: number,
): void {
    draft.portalFrame[key] = value;
    syncDraftToMap();
}

function updatePortalFrameLoad(key: PortalFrameLoadKey, value: number): void {
    draft.portalFrame[key] = value;
    syncDraftToMap();
}

const teamSlug = computed(() => page.props.currentTeam?.slug ?? null);
const placedBuildings = computed(() =>
    props.map.customBuildings.value.filter(isPlacedOnMap),
);
const activeBuilding = computed(() =>
    mapBuildingId.value
        ? (props.map.customBuildings.value.find(
              (building) => building.id === mapBuildingId.value,
          ) ?? null)
        : null,
);

const selectedProjectSlug = ref<string | null>(props.projects[0]?.slug ?? null);
const buildingName = ref('');
const isSaving = ref(false);
const saveError = ref<string | null>(null);
const saveSuccess = ref(false);
const hasProjects = computed(() => props.projects.length > 0);

// Persistence for a building saved before it has been placed on the map.
const unplacedPersistence = ref<BuildingPersistence | null>(null);

const activePersistence = computed(
    () => activeBuilding.value?.persisted ?? unplacedPersistence.value,
);

function clonePortalFrameDesign(design: PortalFrameDesign): PortalFrameDesign {
    return normalizePortalFrameDesign(
        structuredClone(deepToRaw(design)) as PortalFrameDesign,
    );
}

function syncDraftFromBuilding(building: CustomBuilding): void {
    Object.assign(
        draft.portalFrame,
        clonePortalFrameDesign(building.portalFrame),
    );
    draft.rotation = [...building.rotation];
}

// Keep the save form in sync with the active building identity, including
// when a saved building has been removed from the map.
watch(activePersistence, (persisted) => {
    saveError.value = null;
    saveSuccess.value = false;
    buildingName.value = persisted?.name ?? '';
    addressQuery.value = persisted?.addressLabel ?? '';

    if (persisted?.projectSlug) {
        selectedProjectSlug.value = persisted.projectSlug;
    }
});

watch(mapBuildingId, (buildingId, previousBuildingId) => {
    if (!buildingId || buildingId === previousBuildingId) {
        return;
    }

    const building = props.map.customBuildings.value.find(
        (entry) => entry.id === buildingId,
    );

    if (building) {
        syncDraftFromBuilding(building);
    }
});

const buildingContext = computed(() => {
    const persisted = activePersistence.value;

    if (!persisted) {
        return null;
    }

    return findPersistedBuildingContext(props.projects, persisted);
});

function switchToScheme(scheme: ServerScheme): void {
    const persisted = activePersistence.value;

    if (!persisted) {
        return;
    }

    Object.assign(draft.portalFrame, clonePortalFrameDesign(scheme.design));
    syncDraftToMap();

    const active = activeBuilding.value;

    if (active?.persisted) {
        props.map.attachPersistence(active.id, {
            ...active.persisted,
            schemeId: scheme.id,
        });
    } else {
        unplacedPersistence.value = { ...persisted, schemeId: scheme.id };
    }
}

function switchToNewestScheme(): void {
    nextTick(() => {
        const context = buildingContext.value;

        if (!context || context.building.schemes.length === 0) {
            return;
        }

        const newestScheme = [...context.building.schemes].sort(
            (left, right) => right.id - left.id,
        )[0];

        switchToScheme(newestScheme);
    });
}

const locationLabel = computed(() => {
    const query = addressQuery.value.trim();

    if (query) {
        return query;
    }

    const active = activeBuilding.value;

    if (active?.origin) {
        return formatBuildingLocationLabel({
            addressLabel:
                active.persisted?.addressLabel ??
                activePersistence.value?.addressLabel,
            origin: active.origin,
        });
    }

    const persisted = activePersistence.value;

    if (!persisted) {
        return null;
    }

    const context = findPersistedBuildingContext(props.projects, persisted);

    return formatBuildingLocationLabel({
        addressLabel:
            persisted.addressLabel ?? context?.building.addressLabel ?? null,
        origin: context?.building.origin ?? null,
    });
});

const buildingStatistics = computed(() =>
    buildBuildingStatistics({
        projects: props.projects,
        design: draft.portalFrame,
        floorAreaM2:
            carbon.value?.floorAreaM2 ??
            draft.portalFrame.span * draft.portalFrame.buildingLength,
        locationLabel: locationLabel.value,
        persisted: activePersistence.value ?? undefined,
        fallbackProjectSlug: selectedProjectSlug.value,
    }),
);

function openSaveDialog(): void {
    saveError.value = null;
    saveSuccess.value = false;
    saveDialogOpen.value = true;
}

/**
 * The scheme half of a save payload: the active scheme identity, the current
 * design draft, the building's map placement, and the frontend-computed
 * snapshot. Returns null while the design results are unavailable.
 */
function currentSchemeSaveInput(): Omit<SaveSchemeInput, 'building'> | null {
    if (!resolvedFrame.value || !carbon.value || !foundationSizing.value) {
        return null;
    }

    // A map placement is optional: an unplaced building saves without a location.
    const active = activeBuilding.value;

    return {
        scheme: { id: activePersistence.value?.schemeId ?? null },
        draft: {
            portalFrame: { ...draft.portalFrame },
            rotation: [...draft.rotation],
        },
        origin: active?.origin ?? null,
        altitude: active?.altitude ?? null,
        carbon: carbon.value,
        members: resolvedFrame.value.members,
        foundationSizing: foundationSizing.value,
    };
}

/**
 * The scheme designs shown by the switcher come from the `projects` page prop,
 * which a fetch-based save leaves stale. Partially reload it so switching back
 * to a saved scheme restores the design that was just saved.
 */
function refreshProjectsProp(): void {
    router.reload({ only: ['projects'] });
}

async function saveBuilding(): Promise<void> {
    saveError.value = null;
    saveSuccess.value = false;

    const active = activeBuilding.value;
    const persisted = activePersistence.value;

    if (!teamSlug.value) {
        saveError.value = 'Select a team before saving.';

        return;
    }

    if (!selectedProjectSlug.value) {
        saveError.value = 'Create a project before saving.';

        return;
    }

    const schemeInput = currentSchemeSaveInput();

    if (!schemeInput) {
        saveError.value =
            frameError.value ?? 'The design is not ready to save yet.';

        return;
    }

    isSaving.value = true;

    try {
        const { saveScheme } = await import('@/lib/building/save-scheme');

        const response = await saveScheme(
            teamSlug.value,
            selectedProjectSlug.value,
            {
                building: {
                    id: persisted?.buildingId,
                    name: buildingName.value.trim() || 'Untitled building',
                    addressLabel:
                        addressQuery.value.trim() ||
                        persisted?.addressLabel ||
                        null,
                },
                ...schemeInput,
            },
        );

        const nextPersistence: BuildingPersistence = {
            buildingId: response.building.id,
            buildingSlug: response.building.slug,
            projectSlug: selectedProjectSlug.value,
            schemeId: response.scheme.id,
            name: response.building.name,
            addressLabel: response.building.addressLabel,
        };

        if (active) {
            props.map.attachPersistence(active.id, nextPersistence);
        } else {
            unplacedPersistence.value = nextPersistence;
        }

        buildingName.value = response.building.name;
        saveSuccess.value = true;
        refreshProjectsProp();
    } catch (error) {
        saveError.value =
            error instanceof Error
                ? error.message
                : 'Could not save this building.';
    } finally {
        isSaving.value = false;
    }
}

/**
 * Save the active scheme's design snapshot and sync the building's current
 * map placement. Location is shared across schemes on the same building.
 */
async function saveActiveScheme(): Promise<void> {
    const persisted = activePersistence.value;

    if (!teamSlug.value || !persisted) {
        return;
    }

    const schemeInput = currentSchemeSaveInput();

    if (!schemeInput) {
        toast.error(frameError.value ?? 'The design is not ready to save yet.');

        return;
    }

    isSaving.value = true;

    try {
        const { saveScheme } = await import('@/lib/building/save-scheme');
        const active = activeBuilding.value;

        const response = await saveScheme(
            teamSlug.value,
            persisted.projectSlug,
            {
                building: {
                    id: persisted.buildingId,
                    addressLabel:
                        addressQuery.value.trim() ||
                        persisted.addressLabel ||
                        null,
                },
                ...schemeInput,
            },
        );

        const nextPersistence: BuildingPersistence = {
            ...persisted,
            schemeId: response.scheme.id,
            addressLabel: response.building.addressLabel,
        };

        if (active) {
            props.map.attachPersistence(active.id, nextPersistence);
        } else {
            unplacedPersistence.value = nextPersistence;
        }

        toast.success('Scheme saved.');
        refreshProjectsProp();
    } catch (error) {
        toast.error(
            error instanceof Error
                ? error.message
                : 'Could not save this scheme.',
        );
    } finally {
        isSaving.value = false;
    }
}

function handleSaveClick(): void {
    // Once the building exists on the server, the toolbar save only saves the
    // active scheme; the dialog is reserved for the first save.
    if (activePersistence.value?.buildingId) {
        void saveActiveScheme();

        return;
    }

    openSaveDialog();
}

// --- First-run onboarding --------------------------------------------------
const savedBuildingCount = computed(() =>
    props.projects.reduce(
        (total, project) => total + (project.buildings?.length ?? 0),
        0,
    ),
);

function findInitialBuilding(): CustomBuilding | null {
    return findInitialCustomBuilding(
        props.map.customBuildings.value,
        props.focusBuildingSlug,
    );
}

function initializeActiveBuilding(): void {
    const initialBuilding = findInitialBuilding();

    if (!initialBuilding) {
        return;
    }

    mapBuildingId.value = initialBuilding.id;

    if (initialBuilding.persisted?.name) {
        buildingName.value = initialBuilding.persisted.name;
    }

    if (initialBuilding.persisted?.addressLabel) {
        addressQuery.value = initialBuilding.persisted.addressLabel;
    }

    if (initialBuilding.persisted?.projectSlug) {
        selectedProjectSlug.value = initialBuilding.persisted.projectSlug;
    }
}

if (savedBuildingCount.value > 0) {
    initializeActiveBuilding();
}

const onboardingOpen = ref(savedBuildingCount.value === 0);
const onboardingCreationError = ref<string | null>(null);
const isCreatingFirst = ref(false);

async function createFirstBuilding(
    payload: OnboardingCreatePayload,
): Promise<void> {
    onboardingCreationError.value = null;

    if (!teamSlug.value) {
        onboardingCreationError.value = 'Select a team first.';

        return;
    }

    if (!resolvedFrame.value || !carbon.value || !foundationSizing.value) {
        onboardingCreationError.value =
            frameError.value ?? 'The design is not ready to save yet.';

        return;
    }

    isCreatingFirst.value = true;

    try {
        // Ensure a project exists to save the building into.
        if (payload.projectMode === 'new' || !selectedProjectSlug.value) {
            const { createProject } =
                await import('@/lib/building/create-project');
            const project = await createProject(teamSlug.value, {
                name: payload.newProjectName.trim() || 'My First Project',
            });
            selectedProjectSlug.value = project.slug;
        }

        // Place the building on the map (when a location was chosen) and make
        // it the active building. The activeBuilding watcher resets the
        // name field, so re-apply it afterwards before saving.
        const name = buildingName.value.trim() || 'Building 1';

        if (payload.location) {
            const building = props.map.addBuildingAt(
                {
                    portalFrame: { ...draft.portalFrame },
                    rotation: [...draft.rotation],
                },
                [payload.location.lng, payload.location.lat],
            );
            mapBuildingId.value = building.id;
            addressQuery.value = payload.location.label;
        } else {
            mapBuildingId.value = null;
            addressQuery.value = '';
        }

        await nextTick();
        buildingName.value = name;

        await saveBuilding();

        if (saveError.value) {
            onboardingCreationError.value = saveError.value;

            return;
        }

        onboardingOpen.value = false;
    } catch (error) {
        onboardingCreationError.value =
            error instanceof Error
                ? error.message
                : 'Could not create the building.';
    } finally {
        isCreatingFirst.value = false;
    }
}

const activeOrigin = computed(() => activeBuilding.value?.origin ?? null);
const mapInstance = computed(() => props.map.mapInstance.value);

const { surroundings: surroundingsGroup } = useNearbySurroundings(
    mapInstance,
    activeOrigin,
);

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

async function persistBuildingPlacement(
    persisted: BuildingPersistence,
    placement: {
        origin: [number, number] | null;
        altitude?: number;
        addressLabel?: string | null;
        rotation?: BuildingRotation;
    },
): Promise<BuildingPersistence | null> {
    if (!teamSlug.value) {
        return null;
    }

    try {
        const { saveBuildingPlacement } =
            await import('@/lib/building/save-building-placement');

        const response = await saveBuildingPlacement(
            teamSlug.value,
            persisted.projectSlug,
            persisted.buildingSlug,
            {
                latitude: placement.origin ? placement.origin[1] : null,
                longitude: placement.origin ? placement.origin[0] : null,
                altitude: placement.origin
                    ? (placement.altitude ?? null)
                    : null,
                addressLabel: placement.addressLabel ?? null,
                rotation: placement.rotation,
            },
        );

        return {
            ...persisted,
            addressLabel: response.building.addressLabel,
        };
    } catch (error) {
        toast.error(
            error instanceof Error
                ? error.message
                : 'Could not save this building location.',
        );

        return null;
    }
}

async function placeBuildingAtAddress(result: GeocodedAddress): Promise<void> {
    const origin: [number, number] = [result.lng, result.lat];
    const buildingDraft = {
        portalFrame: { ...draft.portalFrame },
        rotation: [...draft.rotation] as [number, number, number],
    };

    // Keep the saved building's identity when it is (re)placed on the map.
    const persisted = activePersistence.value;

    if (mapBuildingId.value) {
        props.map.removeBuilding(mapBuildingId.value);
    }

    const building = props.map.addBuildingAt(buildingDraft, origin);

    if (persisted) {
        const nextPersistence: BuildingPersistence = {
            ...persisted,
            addressLabel: result.label,
        };

        props.map.attachPersistence(building.id, nextPersistence);
        unplacedPersistence.value = null;

        const saved = await persistBuildingPlacement(nextPersistence, {
            origin,
            altitude: building.altitude,
            addressLabel: result.label,
            rotation: buildingDraft.rotation,
        });

        if (saved) {
            props.map.attachPersistence(building.id, saved);
        }
    }

    mapBuildingId.value = building.id;
    addressQuery.value = result.label;
    searchResults.value = [];

    props.openMap({ flyToId: building.id });
}

async function removePlacedBuilding(id: string): Promise<void> {
    const building = placedBuildings.value.find((entry) => entry.id === id);
    const persisted = building?.persisted;

    props.map.removeBuilding(id);

    if (mapBuildingId.value === id) {
        mapBuildingId.value = null;
    }

    if (!persisted) {
        return;
    }

    // Keep scheme identity alive after the building is removed from the map.
    unplacedPersistence.value = {
        ...persisted,
        addressLabel: null,
    };

    const saved = await persistBuildingPlacement(persisted, {
        origin: null,
        addressLabel: null,
    });

    if (saved) {
        unplacedPersistence.value = saved;
    }
}

async function exportBuilding(): Promise<void> {
    isExporting.value = true;

    try {
        const { exportAndDownloadBuildingIfc } =
            await import('@/lib/building/export-building-ifc');

        if (!teamSlug.value) {
            throw new Error('Select a team before exporting IFC.');
        }

        if (!resolvedFrame.value) {
            throw new Error(
                frameError.value ?? 'Could not resolve portal frame sections.',
            );
        }

        await exportAndDownloadBuildingIfc(
            teamSlug.value,
            {
                portalFrame: { ...draft.portalFrame },
                rotation: [...draft.rotation],
            },
            {
                name: activeBuilding.value
                    ? `${draft.portalFrame.span}m span portal frame`
                    : undefined,
            },
        );
    } catch (error) {
        toast.error(
            error instanceof Error
                ? error.message
                : 'Could not export this building as IFC.',
        );
    } finally {
        isExporting.value = false;
    }
}

function updateColumnRestraint(value: ColumnRestraint): void {
    draft.portalFrame.columnRestraint = value;
    syncDraftToMap();
}

function updateRotationAxis(axis: RotationAxis, value: number): void {
    draft.rotation[axis] = value;
    syncDraftToMap();
}

function updateFoundationType(type: FoundationType): void {
    draft.portalFrame.foundation.type = type;
    syncDraftToMap();
}

function updateFoundationAssumption(
    key: keyof FoundationAssumptions,
    value: number,
): void {
    draft.portalFrame.foundation.assumptions[key] = value;
    syncDraftToMap();
}
</script>

<template>
    <div class="relative h-svh min-h-0 w-full overflow-hidden">
        <div class="pointer-events-auto absolute inset-0">
            <BuildingPreview
                :draft="draft"
                :analytical-view="analyticalView"
                :analytical-force-mode="analyticalForceMode"
                :analytical-load-case="analyticalLoadCase"
                :surroundings="surroundingsGroup"
            />
        </div>

        <SceneToolbar>
            <SchemeSwitcher
                v-if="
                    teamSlug &&
                    buildingContext?.project &&
                    buildingContext.building
                "
                :team-slug="teamSlug"
                :project="buildingContext.project"
                :building="buildingContext.building"
                :active-scheme-id="activePersistence?.schemeId ?? null"
                @select="switchToScheme"
                @created="switchToNewestScheme"
            />

            <TooltipProvider :delay-duration="0">
                <Tooltip>
                    <TooltipTrigger as-child>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            class="size-9 rounded-full"
                            data-test="view-map-button"
                            @click="
                                openMap(
                                    mapBuildingId
                                        ? { flyToId: mapBuildingId }
                                        : undefined,
                                )
                            "
                        >
                            <Map class="size-4" />
                            <span class="sr-only">View map</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">View map</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger as-child>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            class="size-9 rounded-full"
                            data-test="save-building-button"
                            :disabled="
                                isSaving ||
                                !hasProjects ||
                                !resolvedFrame ||
                                !carbon
                            "
                            @click="handleSaveClick"
                        >
                            <Save class="size-4" />
                            <span class="sr-only">
                                {{
                                    activePersistence?.buildingId
                                        ? 'Save scheme'
                                        : 'Save building'
                                }}
                            </span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                        {{
                            activePersistence?.buildingId
                                ? 'Save scheme'
                                : 'Save to project'
                        }}
                    </TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger as-child>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            class="size-9 rounded-full"
                            data-test="export-ifc-button"
                            :disabled="isExporting || !resolvedFrame"
                            @click="exportBuilding"
                        >
                            <Download class="size-4" />
                            <span class="sr-only">
                                {{
                                    isExporting ? 'Exporting IFC' : 'Export IFC'
                                }}
                            </span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                        {{ isExporting ? 'Exporting IFC…' : 'Export IFC' }}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </SceneToolbar>

        <ScenePanel
            v-if="carbon"
            v-model:open="carbonPanelOpen"
            side="left"
            title="Embodied carbon"
        >
            <template #tab>
                <Leaf class="size-4" />
            </template>

            <template #leading>
                <Button
                    v-if="!isMobile"
                    type="button"
                    variant="secondary"
                    size="icon"
                    class="mt-3 size-10 shrink-0 rounded-lg rounded-l-none border border-l-0 border-ridge-green bg-background/90 shadow-lg backdrop-blur-md hover:bg-background"
                    aria-label="Close embodied carbon panel"
                    data-test="carbon-panel-close"
                    @click="carbonPanelOpen = false"
                >
                    <ChevronLeft class="size-4" />
                </Button>
            </template>

            <EmbodiedCarbonPanel
                :carbon="carbon"
                :is-carbon-report-previewing="isCarbonReportPreviewing"
                :carbon-report-error="carbonReportError"
                :can-export-report="Boolean(resolvedFrame)"
                @preview-report="previewCarbonReport()"
            />
        </ScenePanel>

        <ScenePanel
            v-model:open="editorPanelOpen"
            side="right"
            title="Portal frame editor"
        >
            <template #tab>
                <SlidersHorizontal class="size-4" />
            </template>

            <template #leading>
                <Button
                    v-if="!isMobile"
                    type="button"
                    variant="secondary"
                    size="icon"
                    class="mt-3 size-10 shrink-0 rounded-lg rounded-r-none border border-r-0 border-ridge-green bg-background/90 shadow-lg backdrop-blur-md hover:bg-background"
                    aria-label="Close portal frame editor"
                    data-test="editor-panel-close"
                    @click="editorPanelOpen = false"
                >
                    <ChevronRight class="size-4" />
                </Button>
            </template>

            <Card
                class="flex min-h-0 flex-1 flex-col gap-0 border-0 bg-transparent py-0 shadow-none"
            >
                <div
                    class="shrink-0 border-b border-sidebar-border/70 px-3 py-3"
                    role="tablist"
                    aria-label="Portal frame editor tabs"
                >
                    <div
                        class="flex items-center gap-1 overflow-x-auto rounded-xl border border-sidebar-border/70 bg-background p-1.5 shadow-sm"
                    >
                        <button
                            v-for="tab in editorTabs"
                            :key="tab.id"
                            type="button"
                            role="tab"
                            :aria-selected="activeTab === tab.id"
                            :aria-label="tab.label"
                            :data-test="`editor-tab-${tab.id}`"
                            class="transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                            :class="
                                activeTab === tab.id
                                    ? 'flex shrink-0 items-center gap-2 rounded-lg bg-[#EBE4D8] px-3 py-2 text-sm font-semibold whitespace-nowrap text-foreground'
                                    : 'flex size-9 shrink-0 items-center justify-center rounded-lg border border-sidebar-border/70 bg-background text-muted-foreground hover:bg-muted/50'
                            "
                            @click="activeTab = tab.id"
                        >
                            <component :is="tab.icon" class="size-4 shrink-0" />
                            <span v-if="activeTab === tab.id">{{
                                tab.label
                            }}</span>
                        </button>
                    </div>
                </div>

                <BuildingStatisticsPanel :statistics="buildingStatistics" />

                <CardContent
                    class="flex min-h-0 flex-1 flex-col gap-0 overflow-y-auto py-0"
                >
                    <div class="flex min-h-0 flex-1 flex-col gap-4 p-4">
                        <!-- Frame Properties -->
                        <FramePropertiesTab
                            v-if="activeTab === 'frame'"
                            :design="draft.portalFrame"
                            :resolved-frame="resolvedFrame"
                            :frame-error="frameError"
                            @update-dimension="updatePortalFrameDimension"
                            @update-load="updatePortalFrameLoad"
                            @update-column-restraint="updateColumnRestraint"
                        />

                        <!-- Analytical View -->
                        <AnalyticalViewTab
                            v-if="activeTab === 'analytical'"
                            v-model:force-mode="analyticalForceMode"
                            v-model:load-case="analyticalLoadCase"
                        />

                        <!-- Foundation Properties -->
                        <FoundationPropertiesTab
                            v-if="activeTab === 'foundation'"
                            :foundation="draft.portalFrame.foundation"
                            :design="draft.portalFrame"
                            :base-reactions="baseReactions"
                            :foundation-sizing="foundationSizing"
                            :foundation-sizing-entries="foundationSizingEntries"
                            @update-type="updateFoundationType"
                            @update-assumption="updateFoundationAssumption"
                        />

                        <!-- Location -->
                        <LocationTab
                            v-if="activeTab === 'location'"
                            v-model:query="addressQuery"
                            :search-results="searchResults"
                            :search-error="searchError"
                            :is-searching="isSearching"
                            :rotation="draft.rotation"
                            :placed-buildings="placedBuildings"
                            :bounds="bounds"
                            @search="searchAddress"
                            @place-at="placeBuildingAtAddress"
                            @update-rotation="updateRotationAxis"
                            @fly-to="
                                (buildingId) => openMap({ flyToId: buildingId })
                            "
                            @remove="removePlacedBuilding"
                        />
                    </div>
                </CardContent>
            </Card>
        </ScenePanel>

        <TypstPdfPreviewDialog
            :open="carbonReportPreviewOpen"
            :pdf-preview-url="carbonReportPreviewUrl"
            :paper-size="carbonReportPaperSize"
            :is-compiling="isCarbonReportPreviewing"
            :error="carbonReportError"
            title="Carbon report preview"
            description="Review the embodied carbon report before downloading."
            @update:open="handleCarbonReportPreviewOpenChange"
            @update:paper-size="
                (paperSize) => {
                    carbonReportPaperSize = paperSize;
                }
            "
            @download="downloadCarbonReport()"
        />

        <OnboardingDialog
            v-model:open="onboardingOpen"
            v-model:project-slug="selectedProjectSlug"
            v-model:building-name="buildingName"
            :projects="projects"
            :team-slug="teamSlug"
            :design="draft.portalFrame"
            :carbon="carbon"
            :design-ready="Boolean(resolvedFrame && carbon)"
            :is-creating="isCreatingFirst"
            :creation-error="onboardingCreationError"
            @create="createFirstBuilding"
        />

        <SaveBuildingDialog
            v-model:open="saveDialogOpen"
            v-model:project-slug="selectedProjectSlug"
            v-model:building-name="buildingName"
            :projects="projects"
            :is-saving="isSaving"
            :save-error="saveError"
            :save-success="saveSuccess"
            :design-ready="Boolean(resolvedFrame && carbon)"
            :is-update="Boolean(activePersistence)"
            @save="saveBuilding"
        />
    </div>
</template>
