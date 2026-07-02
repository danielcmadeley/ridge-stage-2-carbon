<script setup lang="ts">
import { Head } from '@inertiajs/vue3';
import { defineAsyncComponent } from 'vue';
import ClientOnly from '@/components/shared/ClientOnly.vue';
import PendingInvitationsModal from '@/components/teams/PendingInvitationsModal.vue';
import type { DashboardInvitation } from '@/types';
import type { ServerProject } from '@/types/scene';

const UkMap3D = defineAsyncComponent(
    () => import('@/components/scene/UkMap3D.vue'),
);

withDefaults(
    defineProps<{
        projects?: ServerProject[];
        pendingInvitations?: DashboardInvitation[];
        focusBuildingSlug?: string | null;
        focusSchemeId?: number | null;
    }>(),
    {
        projects: () => [],
        pendingInvitations: () => [],
        focusBuildingSlug: null,
        focusSchemeId: null,
    },
);
</script>

<template>
    <Head title="3D Scene" />

    <PendingInvitationsModal
        v-if="pendingInvitations && pendingInvitations.length > 0"
        :invitations="pendingInvitations"
    />

    <div class="relative h-svh min-h-0 overflow-hidden">
        <ClientOnly>
            <UkMap3D
                :projects="projects"
                :focus-building-slug="focusBuildingSlug"
                :focus-scheme-id="focusSchemeId"
            />

            <template #fallback>
                <div
                    class="flex h-full items-center justify-center text-sm text-muted-foreground"
                >
                    Loading scene…
                </div>
            </template>
        </ClientOnly>
    </div>
</template>
