<script setup lang="ts">
import { TresCanvas } from '@tresjs/core';
import type { Group } from 'three';
import { ref } from 'vue';
import BuildingPreviewContent from '@/components/scene/BuildingPreviewContent.vue';
import ForceDiagramTooltip from '@/components/scene/ForceDiagramTooltip.vue';
import FrameMemberInfoPanel from '@/components/scene/FrameMemberInfoPanel.vue';
import type { ForceDiagramHoverInfo } from '@/lib/portal-frame/analysis/force-diagram-hover';
import type {
    AnalyticalForceMode,
    AnalyticalLoadCase,
} from '@/lib/portal-frame/rendering/three-group';
import type { BuildingDraft } from '@/types/custom-building';
import type { FrameMember } from '@/types/portal-frame';

defineProps<{
    draft: BuildingDraft;
    analyticalView?: boolean;
    analyticalForceMode?: AnalyticalForceMode;
    analyticalLoadCase?: AnalyticalLoadCase;
    surroundings?: Group | null;
}>();

const forceHover = ref<ForceDiagramHoverInfo | null>(null);
const selectedMember = ref<FrameMember | null>(null);
</script>

<template>
    <div class="relative h-svh min-h-0 w-full overflow-hidden bg-[#b8d4ea]">
        <TresCanvas
            clear-color="#b8d4ea"
            :alpha="false"
            :tone-mapping-exposure="1.3"
            render-mode="always"
            class="absolute inset-0 h-full w-full"
        >
            <BuildingPreviewContent
                :draft="draft"
                :analytical-view="analyticalView"
                :analytical-force-mode="analyticalForceMode"
                :analytical-load-case="analyticalLoadCase"
                :surroundings="surroundings"
                @force-hover="forceHover = $event"
                @member-select="selectedMember = $event"
            />
        </TresCanvas>

        <ForceDiagramTooltip
            v-if="analyticalView && forceHover"
            :info="forceHover"
        />

        <FrameMemberInfoPanel
            v-if="!analyticalView && selectedMember"
            :member="selectedMember"
        />
    </div>
</template>
