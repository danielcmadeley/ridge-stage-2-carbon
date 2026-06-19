<script setup lang="ts">
import { computed } from 'vue';
import SceneOrbitControls from '@/components/SceneOrbitControls.vue';
import type { BuildingDraft } from '@/types/custom-building';

const props = defineProps<{
    draft: BuildingDraft;
}>();

const cameraPosition = computed(() => {
    const size = Math.max(
        props.draft.dimensions.width,
        props.draft.dimensions.depth,
        props.draft.dimensions.height,
    );

    return [size * 1.4, size * 1.1, size * 1.6] as [number, number, number];
});
</script>

<template>
    <TresPerspectiveCamera :position="cameraPosition" :look-at="[0, 0, 0]" />
    <SceneOrbitControls />

    <TresAmbientLight :intensity="0.45" />
    <TresDirectionalLight :position="[8, 12, 6]" :intensity="1.2" />

    <TresMesh
        :rotation="[draft.rotation[0], draft.rotation[1], draft.rotation[2]]"
        :position="[0, draft.dimensions.height / 2, 0]"
        cast-shadow
    >
        <TresBoxGeometry
            :args="[
                draft.dimensions.width,
                draft.dimensions.height,
                draft.dimensions.depth,
            ]"
        />
        <TresMeshStandardMaterial
            :color="draft.color"
            :metalness="0.25"
            :roughness="0.55"
        />
    </TresMesh>

    <TresMesh :rotation="[-Math.PI / 2, 0, 0]" :position="[0, 0, 0]">
        <TresPlaneGeometry :args="[80, 80]" />
        <TresMeshStandardMaterial color="#1e293b" :roughness="0.9" />
    </TresMesh>
</template>
