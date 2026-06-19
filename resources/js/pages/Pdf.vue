<script setup lang="ts">
import { Head } from '@inertiajs/vue3';
import { defineAsyncComponent } from 'vue';
import { dashboard, pdf } from '@/routes';
import type { Team } from '@/types';

const TypstPdfTest = defineAsyncComponent(
    () => import('@/components/TypstPdfTest.vue'),
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
                title: 'PDF',
                href: props.currentTeam ? pdf(props.currentTeam.slug) : '/',
            },
        ],
    }),
});
</script>

<template>
    <Head title="PDF" />

    <div
        class="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4"
    >
        <div
            class="relative min-h-[calc(100vh-8rem)] flex-1 rounded-xl border border-sidebar-border/70 dark:border-sidebar-border"
        >
            <TypstPdfTest />
        </div>
    </div>
</template>
