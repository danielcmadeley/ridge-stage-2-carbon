<script setup lang="ts">
import { Head } from '@inertiajs/vue3';
import { defineAsyncComponent } from 'vue';
import PendingInvitationsModal from '@/components/PendingInvitationsModal.vue';
import { scene } from '@/routes';
import type { DashboardInvitation, Team } from '@/types';

const UkMap3D = defineAsyncComponent(
    () => import('@/components/UkMap3D.vue'),
);

defineProps<{
    pendingInvitations?: DashboardInvitation[];
}>();

defineOptions({
    layout: (props: { currentTeam?: Team | null }) => ({
        breadcrumbs: [
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

    <PendingInvitationsModal
        v-if="pendingInvitations && pendingInvitations.length > 0"
        :invitations="pendingInvitations"
    />

    <div class="relative h-[calc(100svh-4rem)] min-h-0 overflow-hidden">
        <UkMap3D />
    </div>
</template>
