<script setup lang="ts">
import { OrbitControls } from '@tresjs/cientos';
import { useTresContext } from '@tresjs/core';
import type { OrbitControls as OrbitControlsInstance } from 'three-stdlib';
import {
    computed,
    shallowRef,
    unref,
    watch,
} from 'vue';

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

const { camera, renderer } = useTresContext();
const orbitControlsRef = shallowRef<{
    instance: OrbitControlsInstance | null;
} | null>(null);

const activeCamera = computed(() => camera.activeCamera.value);
const orbitTarget = shallowRef<[number, number, number]>([...props.target]);
const initializedControls = new WeakSet<OrbitControlsInstance>();

function resolveControlsInstance(): OrbitControlsInstance | null {
    const exposed = orbitControlsRef.value?.instance;

    return exposed ? unref(exposed) : null;
}

function syncOrbitLimits(instance: OrbitControlsInstance): void {
    instance.minDistance = props.minDistance;
    instance.maxDistance = props.maxDistance;
}

function applyInitialView(instance: OrbitControlsInstance): void {
    if (initializedControls.has(instance) || !activeCamera.value) {
        return;
    }

    activeCamera.value.up.set(...props.up);

    if (props.initialPosition) {
        activeCamera.value.position.set(...props.initialPosition);
    }

    orbitTarget.value = [...props.target];
    instance.target.set(...props.target);
    syncOrbitLimits(instance);
    instance.update();
    initializedControls.add(instance);
}

watch(
    () => orbitControlsRef.value?.instance,
    (instance) => {
        if (!instance) {
            return;
        }

        applyInitialView(unref(instance));
    },
    { immediate: true },
);

watch(activeCamera, () => {
    const instance = resolveControlsInstance();

    if (instance) {
        applyInitialView(instance);
    }
});

watch(
    () => [props.minDistance, props.maxDistance] as const,
    () => {
        const instance = resolveControlsInstance();

        if (!instance) {
            return;
        }

        syncOrbitLimits(instance);
    },
);

function handleControlsChange(): void {
    renderer.invalidate();
}
</script>

<template>
    <OrbitControls
        ref="orbitControlsRef"
        make-default
        :target="orbitTarget"
        :min-distance="props.minDistance"
        :max-distance="props.maxDistance"
        :enable-damping="true"
        :damping-factor="0.05"
        :enable-rotate="true"
        @change="handleControlsChange"
    />
</template>
