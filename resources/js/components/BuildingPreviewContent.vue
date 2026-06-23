<script setup lang="ts">
import { Group } from 'three';
import { computed, onUnmounted, shallowRef, watch } from 'vue';
import SceneOrbitControls from '@/components/SceneOrbitControls.vue';
import { useForceDiagramHover } from '@/composables/useForceDiagramHover';
import type { ForceDiagramHoverInfo } from '@/lib/portal-frame/force-diagram-hover';
import {
    disposeObject3D,
    portalFramePreviewMetrics,
    replacePortalFrameThreeGroup,
    type AnalyticalForceMode,
} from '@/lib/portal-frame/three-group';
import type { BuildingDraft } from '@/types/custom-building';

const props = defineProps<{
    draft: BuildingDraft;
    analyticalView?: boolean;
    analyticalForceMode?: AnalyticalForceMode;
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

    <TresAmbientLight :intensity="0.55" />
    <TresDirectionalLight :position="[8, 6, 12]" :intensity="1.2" />

    <primitive :object="frameGroup" />

    <TresMesh :position="[0, 0, 0]">
        <TresPlaneGeometry :args="[120, 120]" />
        <TresMeshStandardMaterial color="#f3f4f6" :roughness="0.95" />
    </TresMesh>
</template>
