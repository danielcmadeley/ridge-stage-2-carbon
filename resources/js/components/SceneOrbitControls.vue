<script setup lang="ts">
import { useLoop, useTres } from '@tresjs/core';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { onUnmounted, shallowRef, watchEffect } from 'vue';

const { camera, renderer } = useTres();
const controls = shallowRef<OrbitControls | null>(null);

watchEffect((onCleanup) => {
    if (!camera.value || !renderer) {
        return;
    }

    const instance = new OrbitControls(camera.value, renderer.domElement);
    instance.enableDamping = true;
    instance.dampingFactor = 0.05;
    instance.minDistance = 3;
    instance.maxDistance = 20;
    controls.value = instance;

    onCleanup(() => {
        instance.dispose();
        controls.value = null;
    });
});

const { onRender } = useLoop();

onRender(() => {
    controls.value?.update();
});

onUnmounted(() => {
    controls.value?.dispose();
    controls.value = null;
});
</script>

<template>
    <slot />
</template>
