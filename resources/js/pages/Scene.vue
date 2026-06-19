<script setup lang="ts">
import { Head } from '@inertiajs/vue3';
import { defineAsyncComponent } from 'vue';
import { dashboard, scene } from '@/routes';
import type { Team } from '@/types';

const UkMap3D = defineAsyncComponent(
    () => import('@/components/UkMap3D.vue'),
);

defineOptions({
    layout: (props: { currentTeam?: Team | null }) => ({
        breadcrumbs: [
            {
                title: 'Dashboard',
                href: props.currentTeam
                    ? dashboard(props.currentTeam.slug)
                    : '/',
            },
            {
                title: '3D Scene',
                href: props.currentTeam ? scene(props.currentTeam.slug) : '/',
            },
        ],
    }),
});
</script>

<template>
    <Head title="3D Scene" />

    <div
        class="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4"
    >
        <UkMap3D />
    </div>
</template>
