<script setup lang="ts">
import { usePage } from '@inertiajs/vue3';
import { ChevronsUpDown } from '@lucide/vue';
import { computed } from 'vue';
import UserInfo from '@/components/app/UserInfo.vue';
import UserMenuContent from '@/components/app/UserMenuContent.vue';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Team } from '@/types';

const props = withDefaults(
    defineProps<{
        triggerClass?: string;
        contentSide?: 'top' | 'bottom' | 'left' | 'right';
        avatarOnly?: boolean;
    }>(),
    {
        triggerClass: '',
        contentSide: 'bottom',
        avatarOnly: false,
    },
);

const page = usePage();
const user = page.props.auth.user;
const currentTeam = computed(() => page.props.currentTeam as Team | null);
</script>

<template>
    <DropdownMenu>
        <DropdownMenuTrigger as-child>
            <button
                type="button"
                :aria-label="
                    avatarOnly ? `${user.name} account menu` : undefined
                "
                :class="
                    cn(
                        'flex items-center gap-2 text-left text-sm hover:bg-accent data-[state=open]:bg-accent',
                        props.triggerClass,
                    )
                "
                data-test="navigation-menu-user-button"
            >
                <UserInfo
                    :user="user"
                    :team="currentTeam"
                    :avatar-only="avatarOnly"
                />
                <ChevronsUpDown
                    v-if="!avatarOnly"
                    class="ml-auto size-4 shrink-0"
                />
            </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
            class="w-(--reka-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            :side="contentSide"
            align="end"
            :side-offset="4"
        >
            <UserMenuContent :user="user" />
        </DropdownMenuContent>
    </DropdownMenu>
</template>
