<script setup lang="ts">
import { extend, useLoop, useTresContext } from '@tresjs/core';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { computed, onUnmounted, shallowRef, watch } from 'vue';

extend({ OrbitControls });

const props = withDefaults(
    defineProps<{
        minDistance?: number;
        maxDistance?: number;
        target?: [number, number, number];
        initialPosition?: [number, number, number];
    }>(),
    {
        minDistance: 2,
        maxDistance: 500,
        target: () => [0, 0, 0] as [number, number, number],
    },
);

const { camera, renderer, controls: tresControls } = useTresContext();
const controlsRef = shallowRef<OrbitControls | null>(null);

const activeCamera = computed(() => camera.activeCamera.value);
const domElement = computed(() => renderer.instance.domElement);

watch(
    () => props.initialPosition,
    (position) => {
        if (!activeCamera.value || !position) {
            return;
        }

        activeCamera.value.position.set(...position);
        controlsRef.value?.update();
    },
    { immediate: true },
);

watch(controlsRef, (instance) => {
    tresControls.value = instance;

    if (!instance) {
        return;
    }

    instance.addEventListener('change', () => {
        renderer.invalidate();
    });
});

watch(
    () => [props.minDistance, props.maxDistance, props.target] as const,
    ([minDistance, maxDistance, target]) => {
        if (!controlsRef.value) {
            return;
        }

        controlsRef.value.target.set(...target);
        controlsRef.value.minDistance = minDistance;
        controlsRef.value.maxDistance = maxDistance;
    },
);

const { onBeforeRender } = useLoop();

onBeforeRender(() => {
    controlsRef.value?.update();
});

onUnmounted(() => {
    tresControls.value = null;
});
</script>

<template>
    <TresOrbitControls
        v-if="activeCamera && domElement"
        :key="activeCamera.uuid"
        ref="controlsRef"
        :args="[activeCamera, domElement]"
        :target="target"
        :enable-damping="true"
        :damping-factor="0.05"
        :enable-rotate="true"
        :min-distance="minDistance"
        :max-distance="maxDistance"
    />
</template>
