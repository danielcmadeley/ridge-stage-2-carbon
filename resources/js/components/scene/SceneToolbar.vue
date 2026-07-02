<script setup lang="ts">
import { usePage } from '@inertiajs/vue3';
import { Menu } from '@lucide/vue';
import { computed } from 'vue';
import UserMenuContent from '@/components/app/UserMenuContent.vue';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { dashboard } from '@/routes';

const page = usePage();
const user = page.props.auth.user;
const dashboardUrl = computed(() =>
    page.props.currentTeam ? dashboard(page.props.currentTeam.slug).url : '/',
);
</script>

<template>
    <div
        class="pointer-events-auto absolute top-4 left-1/2 z-30 flex w-fit max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-1 rounded-full border border-ridge-green bg-background/90 p-1 shadow-2xl backdrop-blur-md"
        role="toolbar"
        aria-label="Scene tools"
        data-test="scene-toolbar"
    >
        <DropdownMenu>
            <DropdownMenuTrigger as-child>
                <Button
                    variant="ghost"
                    size="icon"
                    class="size-9 shrink-0 rounded-full"
                    aria-label="Open menu"
                    data-test="navigation-menu-trigger"
                >
                    <Menu class="size-5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                class="min-w-56 rounded-lg"
                side="bottom"
                align="start"
                :side-offset="4"
            >
                <UserMenuContent :user="user" :dashboard-url="dashboardUrl" />
            </DropdownMenuContent>
        </DropdownMenu>

        <div class="flex items-center gap-1">
            <slot />
        </div>
    </div>
</template>
