<script setup lang="ts">
import { useTres } from '@tresjs/core';
import { Sky } from 'three-stdlib';
import { computed, shallowRef, watch } from 'vue';
import { applyZUpSkyUniforms } from '@/lib/portal-frame/rendering/z-up-sky';
import type { ZUpSkyOptions } from '@/lib/portal-frame/rendering/z-up-sky';

const props = withDefaults(defineProps<ZUpSkyOptions>(), {
    turbidity: 8,
    rayleigh: 2,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.8,
    elevation: 20,
    azimuth: 215,
    distance: 3000,
});

const sky = shallowRef(new Sky());
const { invalidate } = useTres();

const skyOptions = computed(
    (): Required<ZUpSkyOptions> => ({
        turbidity: props.turbidity,
        rayleigh: props.rayleigh,
        mieCoefficient: props.mieCoefficient,
        mieDirectionalG: props.mieDirectionalG,
        elevation: props.elevation,
        azimuth: props.azimuth,
        distance: props.distance,
    }),
);

watch(
    skyOptions,
    (options) => {
        applyZUpSkyUniforms(sky.value.material, options);
        invalidate();
    },
    { immediate: true },
);
</script>

<template>
    <primitive :object="sky" :scale="distance" />
</template>
