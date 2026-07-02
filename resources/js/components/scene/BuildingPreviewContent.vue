<script setup lang="ts">
import { Group } from 'three';
import { computed, onUnmounted, shallowRef, watch } from 'vue';
import SceneOrbitControls from '@/components/scene/SceneOrbitControls.vue';
import ZUpSky from '@/components/scene/ZUpSky.vue';
import { useColumnGridSelection } from '@/composables/useColumnGridSelection';
import { useForceDiagramHover } from '@/composables/useForceDiagramHover';
import type { ForceDiagramHoverInfo } from '@/lib/portal-frame/analysis/force-diagram-hover';
import {
    disposeObject3D,
    portalFramePreviewMetrics,
    replacePortalFrameThreeGroup,
} from '@/lib/portal-frame/rendering/three-group';
import type { AnalyticalForceMode } from '@/lib/portal-frame/rendering/three-group';
import type { BuildingDraft } from '@/types/custom-building';

const props = defineProps<{
    draft: BuildingDraft;
    analyticalView?: boolean;
    analyticalForceMode?: AnalyticalForceMode;
    surroundings?: Group | null;
}>();

const emit = defineEmits<{
    forceHover: [ForceDiagramHoverInfo | null];
}>();

const frameGroup = shallowRef<Group>(new Group());
const cameraUp = [0, 0, 1] as [number, number, number];

watch(
    () =>
        [
            props.draft.portalFrame,
            props.analyticalView,
            props.analyticalForceMode,
        ] as const,
    ([design, analyticalView, forceMode]) => {
        try {
            frameGroup.value = replacePortalFrameThreeGroup(
                frameGroup.value,
                design,
                analyticalView ? 'analytical' : 'solid',
                forceMode ?? 'moment',
            );
        } catch {
            // Out-of-scope or unresolved design: clear the preview. The editor
            // panel surfaces the specific reason via the frame error message.
            disposeObject3D(frameGroup.value);
            frameGroup.value = new Group();
        }
    },
    { immediate: true, deep: true },
);

const metrics = computed(() =>
    portalFramePreviewMetrics(props.draft.portalFrame),
);

const analyticalViewEnabled = computed(() => props.analyticalView === true);
const lineThresholdM = computed(() =>
    Math.max(metrics.value.size * 0.015, 0.15),
);

const { hoverInfo } = useForceDiagramHover({
    enabled: analyticalViewEnabled,
    frameGroup,
    lineThresholdM,
});

useColumnGridSelection({
    enabled: computed(() => !analyticalViewEnabled.value),
    frameGroup,
    design: computed(() => props.draft.portalFrame),
    lineThresholdM,
});

watch(
    hoverInfo,
    (info) => {
        emit('forceHover', info ?? null);
    },
    { immediate: true },
);

const cameraPosition = computed(
    () =>
        [
            metrics.value.size * 1.4,
            metrics.value.size * 1.2,
            metrics.value.apexHeight * 1.35,
        ] as [number, number, number],
);

const orbitLimits = computed(() => ({
    minDistance: Math.max(metrics.value.size * 0.35, 2),
    maxDistance: Math.max(metrics.value.size * 10, 40),
}));

const orbitTarget = computed(
    () => [0, 0, metrics.value.apexHeight / 2] as [number, number, number],
);

const sunPosition = computed(
    () =>
        [
            metrics.value.size * 0.8,
            -metrics.value.size * 0.9,
            metrics.value.apexHeight * 3,
        ] as [number, number, number],
);

const fogArgs = computed(
    () =>
        ['#b9c7d6', metrics.value.size * 1.5, metrics.value.size * 8] as [
            string,
            number,
            number,
        ],
);

onUnmounted(() => {
    disposeObject3D(frameGroup.value);
});
</script>

<template>
    <TresPerspectiveCamera :up="cameraUp" />
    <SceneOrbitControls
        :initial-position="cameraPosition"
        :target="orbitTarget"
        :min-distance="orbitLimits.minDistance"
        :max-distance="orbitLimits.maxDistance"
        :up="cameraUp"
    />

    <TresFog :args="fogArgs" />
    <ZUpSky
        :turbidity="8"
        :rayleigh="2"
        :mie-coefficient="0.005"
        :mie-directional-g="0.8"
        :elevation="20"
        :azimuth="215"
        :distance="3000"
    />

    <TresAmbientLight :intensity="0.35" />
    <TresHemisphereLight
        :sky-color="'#bcd4e8'"
        :ground-color="'#4a3f33'"
        :intensity="0.45"
    />
    <TresDirectionalLight
        :position="sunPosition"
        :intensity="1.15"
    />

    <primitive
        v-if="surroundings && !analyticalViewEnabled"
        :object="surroundings"
    />

    <primitive :object="frameGroup" />
</template>
