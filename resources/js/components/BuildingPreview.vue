<script setup lang="ts">
import { ref } from 'vue';
import { TresCanvas } from '@tresjs/core';
import BuildingPreviewContent from '@/components/BuildingPreviewContent.vue';
import ForceDiagramTooltip from '@/components/ForceDiagramTooltip.vue';
import type { ForceDiagramHoverInfo } from '@/lib/portal-frame/force-diagram-hover';
import type { AnalyticalForceMode } from '@/lib/portal-frame/three-group';
import type { BuildingDraft } from '@/types/custom-building';

defineProps<{
    draft: BuildingDraft;
    analyticalView?: boolean;
    analyticalForceMode?: AnalyticalForceMode;
}>();

const forceHover = ref<ForceDiagramHoverInfo | null>(null);
</script>

<template>
    <div class="relative h-full w-full">
        <TresCanvas clear-color="#ffffff" render-mode="always" class="h-full w-full">
            <BuildingPreviewContent
                :draft="draft"
                :analytical-view="analyticalView"
                :analytical-force-mode="analyticalForceMode"
                @force-hover="forceHover = $event"
            />
        </TresCanvas>

        <ForceDiagramTooltip
            v-if="analyticalView && forceHover"
            :info="forceHover"
        />
    </div>
</template>
