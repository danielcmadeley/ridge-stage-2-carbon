<script setup lang="ts">
import { TresCanvas } from '@tresjs/core';
import type { Group } from 'three';
import { ref } from 'vue';
import BuildingPreviewContent from '@/components/scene/BuildingPreviewContent.vue';
import ForceDiagramTooltip from '@/components/scene/ForceDiagramTooltip.vue';
import type { ForceDiagramHoverInfo } from '@/lib/portal-frame/analysis/force-diagram-hover';
import type { AnalyticalForceMode } from '@/lib/portal-frame/rendering/three-group';
import type { BuildingDraft } from '@/types/custom-building';

defineProps<{
    draft: BuildingDraft;
    analyticalView?: boolean;
    analyticalForceMode?: AnalyticalForceMode;
    surroundings?: Group | null;
}>();

const forceHover = ref<ForceDiagramHoverInfo | null>(null);
</script>

<template>
    <div class="relative h-svh min-h-0 w-full overflow-hidden bg-[#9fb8d3]">
        <TresCanvas
            clear-color="#9fb8d3"
            :alpha="false"
            :tone-mapping-exposure="0.75"
            render-mode="always"
            class="absolute inset-0 h-full w-full"
        >
            <BuildingPreviewContent
                :draft="draft"
                :analytical-view="analyticalView"
                :analytical-force-mode="analyticalForceMode"
                :surroundings="surroundings"
                @force-hover="forceHover = $event"
            />
        </TresCanvas>

        <ForceDiagramTooltip
            v-if="analyticalView && forceHover"
            :info="forceHover"
        />
    </div>
</template>
