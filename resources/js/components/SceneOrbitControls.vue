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
        up?: [number, number, number];
    }>(),
    {
        minDistance: 2,
        maxDistance: 500,
        target: () => [0, 0, 0] as [number, number, number],
        up: () => [0, 0, 1] as [number, number, number],
    },
);

const { camera, renderer, controls: tresControls } = useTresContext();
const controlsRef = shallowRef<OrbitControls | null>(null);
const controlTarget = shallowRef<[number, number, number]>([...props.target]);
const initializedControls = new WeakSet<OrbitControls>();

const activeCamera = computed(() => camera.activeCamera.value);
const domElement = computed(() => renderer.instance.domElement);

function applyInitialView(instance: OrbitControls): void {
    if (initializedControls.has(instance) || !activeCamera.value) {
        return;
    }

    activeCamera.value.up.set(...props.up);

    if (props.initialPosition) {
        activeCamera.value.position.set(...props.initialPosition);
    }

    controlTarget.value = [...props.target];
    instance.target.set(...props.target);
    instance.minDistance = props.minDistance;
    instance.maxDistance = props.maxDistance;
    instance.update();
    initializedControls.add(instance);
}

watch(controlsRef, (instance) => {
    tresControls.value = instance;

    if (!instance) {
        return;
    }

    applyInitialView(instance);

    instance.addEventListener('change', () => {
        renderer.invalidate();
    });
});

watch(activeCamera, () => {
    if (controlsRef.value) {
        applyInitialView(controlsRef.value);
    }
});

watch(
    () => [props.minDistance, props.maxDistance, props.up] as const,
    ([minDistance, maxDistance, up]) => {
        if (!controlsRef.value || !activeCamera.value) {
            return;
        }

        activeCamera.value.up.set(...up);
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
        :target="controlTarget"
        :enable-damping="true"
        :damping-factor="0.05"
        :enable-rotate="true"
        :min-distance="minDistance"
        :max-distance="maxDistance"
    />
</template>
