<script setup lang="ts">
import { TresCanvas } from '@tresjs/core';
import BuildingPreviewContent from '@/components/BuildingPreviewContent.vue';
import type { AnalyticalForceMode } from '@/lib/portal-frame/three-group';
import type { BuildingDraft } from '@/types/custom-building';

defineProps<{
    draft: BuildingDraft;
    analyticalView?: boolean;
    analyticalForceMode?: AnalyticalForceMode;
}>();
</script>

<template>
    <TresCanvas clear-color="#ffffff" render-mode="always" class="h-full w-full">
        <BuildingPreviewContent
            :draft="draft"
            :analytical-view="analyticalView"
            :analytical-force-mode="analyticalForceMode"
        />
    </TresCanvas>
</template>
