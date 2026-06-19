<script setup lang="ts">
import { TresCanvas } from '@tresjs/core';
import BuildingPreviewContent from '@/components/BuildingPreviewContent.vue';
import type { BuildingDraft } from '@/types/custom-building';

defineProps<{
    draft: BuildingDraft;
}>();
</script>

<template>
    <TresCanvas clear-color="#0f172a" class="h-full w-full">
        <BuildingPreviewContent :draft="draft" />
    </TresCanvas>
</template>
