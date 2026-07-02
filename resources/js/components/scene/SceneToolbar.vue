<script setup lang="ts">
import { Link, usePage } from '@inertiajs/vue3';
import { Menu } from '@lucide/vue';
import { computed } from 'vue';
import AppUserMenu from '@/components/app/AppUserMenu.vue';
import { Button } from '@/components/ui/button';
import { dashboard } from '@/routes';

const page = usePage();
const dashboardUrl = computed(() =>
    page.props.currentTeam ? dashboard(page.props.currentTeam.slug).url : '/',
);
</script>

<template>
    <div
        class="pointer-events-auto absolute top-4 left-1/2 z-30 flex w-[min(calc(100%-2rem),40rem)] -translate-x-1/2 items-stretch gap-1 rounded-full border border-ridge-green bg-background/90 p-1 shadow-2xl backdrop-blur-md"
        role="toolbar"
        aria-label="Scene tools"
        data-test="scene-toolbar"
    >
        <Button
            as-child
            variant="ghost"
            size="icon"
            class="size-9 shrink-0 rounded-full"
            aria-label="Back to dashboard"
            data-test="navigation-menu-trigger"
        >
            <Link :href="dashboardUrl">
                <Menu class="size-5" />
            </Link>
        </Button>

        <div class="flex min-h-9 flex-1 items-center gap-1 px-1">
            <slot />
        </div>

        <AppUserMenu
            avatar-only
            trigger-class="size-9 shrink-0 rounded-full justify-center p-0"
            content-side="bottom"
        />
    </div>
</template>
