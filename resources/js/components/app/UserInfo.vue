<script setup lang="ts">
import { computed } from 'vue';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/composables/useInitials';
import { cn } from '@/lib/utils';
import type { Team, User } from '@/types';

type Props = {
    user: User;
    showEmail?: boolean;
    team?: Team | null;
    avatarOnly?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
    showEmail: false,
    team: null,
    avatarOnly: false,
});

const { getInitials } = useInitials();

const showAvatar = computed(
    () => props.user.avatar && props.user.avatar !== '',
);
</script>

<template>
    <Avatar
        :class="
            cn(
                'overflow-hidden',
                avatarOnly ? 'size-9 rounded-full' : 'h-8 w-8 rounded-lg',
            )
        "
    >
        <AvatarImage v-if="showAvatar" :src="user.avatar!" :alt="user.name" />
        <AvatarFallback
            :class="
                cn(
                    'text-black dark:text-white',
                    avatarOnly ? 'rounded-full' : 'rounded-lg',
                )
            "
        >
            {{ getInitials(user.name) }}
        </AvatarFallback>
    </Avatar>

    <div v-if="!avatarOnly" class="grid flex-1 text-left text-sm leading-tight">
        <span class="truncate font-medium">{{ user.name }}</span>
        <span v-if="team" class="truncate text-xs text-muted-foreground">{{
            team.name
        }}</span>
        <span
            v-else-if="showEmail"
            class="truncate text-xs text-muted-foreground"
            >{{ user.email }}</span
        >
    </div>
</template>
