<script setup lang="ts">
import AppShell from '@/components/app/AppShell.vue';
import AppTopNav from '@/components/app/AppTopNav.vue';
import { Toaster } from '@/components/ui/sonner';
import type { BreadcrumbItem } from '@/types';

type Props = {
    breadcrumbs?: BreadcrumbItem[];
};

withDefaults(defineProps<Props>(), {
    breadcrumbs: () => [],
});
</script>

<template>
    <AppShell variant="header">
        <div class="flex min-h-svh w-full flex-1 flex-col">
            <AppTopNav :breadcrumbs="breadcrumbs" />
            <main class="relative flex flex-1 flex-col overflow-x-hidden">
                <slot />
            </main>
        </div>
        <Toaster />
    </AppShell>
</template>
