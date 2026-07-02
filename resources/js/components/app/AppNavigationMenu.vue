<script setup lang="ts">
import { Link, router, usePage } from '@inertiajs/vue3';
import { Box, LayoutDashboard } from '@lucide/vue';
import { computed, onMounted, onUnmounted } from 'vue';
import AppLogo from '@/components/app/AppLogo.vue';
import TeamSwitcher from '@/components/teams/TeamSwitcher.vue';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useCurrentUrl } from '@/composables/useCurrentUrl';
import { dashboard, scene } from '@/routes';
import type { NavItem } from '@/types';

const open = defineModel<boolean>('open', { default: false });

const page = usePage();
const { isCurrentUrl } = useCurrentUrl();

const dashboardUrl = computed(() =>
    page.props.currentTeam ? dashboard(page.props.currentTeam.slug).url : '/',
);

const sceneUrl = computed(() =>
    page.props.currentTeam ? scene(page.props.currentTeam.slug).url : '/',
);

const mainNavItems = computed<NavItem[]>(() => [
    {
        title: 'Dashboard',
        href: dashboardUrl.value,
        icon: LayoutDashboard,
    },
    {
        title: '3D Scene',
        href: sceneUrl.value,
        icon: Box,
    },
]);

function closeMenu(): void {
    open.value = false;
}

let removeNavigateListener: (() => void) | undefined;

onMounted(() => {
    removeNavigateListener = router.on('navigate', closeMenu);
});

onUnmounted(() => {
    removeNavigateListener?.();
});
</script>

<template>
    <Dialog v-model:open="open">
        <DialogContent class="gap-0 p-0 sm:max-w-md">
            <DialogHeader class="sr-only">
                <DialogTitle>Navigation menu</DialogTitle>
                <DialogDescription> Application navigation </DialogDescription>
            </DialogHeader>

            <div class="flex flex-col">
                <div class="flex flex-col gap-4 p-4">
                    <Link
                        :href="dashboardUrl"
                        class="flex items-center gap-2 rounded-md p-2 hover:bg-accent"
                        @click="closeMenu"
                    >
                        <AppLogo />
                    </Link>

                    <TeamSwitcher />
                </div>

                <Separator />

                <nav class="flex flex-col gap-1 p-4" aria-label="Platform">
                    <p class="px-2 text-xs font-medium text-muted-foreground">
                        Platform
                    </p>
                    <Link
                        v-for="item in mainNavItems"
                        :key="item.title"
                        :href="item.href"
                        class="flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium hover:bg-accent"
                        :class="{
                            'bg-accent font-medium': isCurrentUrl(item.href),
                        }"
                        @click="closeMenu"
                    >
                        <component :is="item.icon" class="size-4 shrink-0" />
                        <span>{{ item.title }}</span>
                    </Link>
                </nav>
            </div>
        </DialogContent>
    </Dialog>
</template>
