<script setup lang="ts">
import { computed } from 'vue';
import { describeFrameMember } from '@/lib/portal-frame/rendering/member-selection';
import type { FrameMember } from '@/types/portal-frame';

const props = defineProps<{
    member: FrameMember;
}>();

const description = computed(() => describeFrameMember(props.member));
</script>

<template>
    <div
        class="pointer-events-none absolute bottom-4 left-1/2 z-10 min-w-56 -translate-x-1/2 rounded-md border border-sidebar-border/70 bg-background/95 px-4 py-2.5 text-xs shadow-md backdrop-blur-sm"
    >
        <p class="font-medium text-foreground">{{ description.title }}</p>
        <div class="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
            <p
                v-for="row in description.rows"
                :key="row.label"
                class="text-muted-foreground"
            >
                {{ row.label }}
                <span class="text-foreground">{{ row.value }}</span>
            </p>
        </div>
    </div>
</template>
