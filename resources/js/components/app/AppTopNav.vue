<script setup lang="ts">
import { Menu } from '@lucide/vue';
import { ref } from 'vue';
import AppNavigationMenu from '@/components/app/AppNavigationMenu.vue';
import AppUserMenu from '@/components/app/AppUserMenu.vue';
import Breadcrumbs from '@/components/app/Breadcrumbs.vue';
import { Button } from '@/components/ui/button';
import type { BreadcrumbItem } from '@/types';

withDefaults(
    defineProps<{
        breadcrumbs?: BreadcrumbItem[];
    }>(),
    {
        breadcrumbs: () => [],
    },
);

const menuOpen = ref(false);
</script>

<template>
    <header
        class="flex h-12 shrink-0 items-center gap-2 border-b border-sidebar-border/70 px-4"
    >
        <Button
            variant="ghost"
            size="icon"
            class="-ml-1 size-8"
            aria-label="Open navigation menu"
            data-test="navigation-menu-trigger"
            @click="menuOpen = true"
        >
            <Menu class="size-5" />
        </Button>

        <template v-if="breadcrumbs && breadcrumbs.length > 0">
            <Breadcrumbs :breadcrumbs="breadcrumbs" />
        </template>

        <AppUserMenu trigger-class="ml-auto rounded-md p-2" />

        <AppNavigationMenu v-model:open="menuOpen" />
    </header>
</template>
