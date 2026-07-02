<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

const open = defineModel<boolean>('open', { default: true });

defineProps<{
    side: 'left' | 'right';
    title: string;
}>();

const isMobile = useMediaQuery('(max-width: 768px)');

const panelPositionClasses = {
    left: 'top-4 left-4',
    right: 'top-4 right-4',
} as const;

const tabPositionClasses = {
    left: 'top-4 left-0 rounded-r-lg rounded-l-none border-l-0',
    right: 'top-4 right-0 rounded-l-lg rounded-r-none border-r-0',
} as const;
</script>

<template>
    <Sheet v-if="isMobile" :open="open" @update:open="open = $event">
        <SheetContent
            :side="side"
            class="flex w-[min(100%,20rem)] flex-col gap-0 border-ridge-green p-0 sm:max-w-80"
        >
            <SheetHeader class="sr-only">
                <SheetTitle>{{ title }}</SheetTitle>
            </SheetHeader>
            <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
                <slot />
            </div>
        </SheetContent>
    </Sheet>

    <div
        v-else-if="!isMobile && open"
        :class="[
            'pointer-events-auto absolute z-20 flex h-[calc(100%-2rem)] items-start',
            panelPositionClasses[side],
        ]"
        :data-test="`${side}-scene-panel`"
    >
        <slot v-if="side === 'right'" name="leading" />
        <aside
            class="flex h-full w-72 flex-col overflow-hidden rounded-xl border border-ridge-green bg-background/90 shadow-2xl backdrop-blur-md sm:w-80"
        >
            <slot />
        </aside>
        <slot v-if="side === 'left'" name="leading" />
    </div>

    <TooltipProvider v-if="!open" :delay-duration="0">
        <Tooltip>
            <TooltipTrigger as-child>
                <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    class="pointer-events-auto absolute z-20 size-10 border border-ridge-green bg-background/90 shadow-lg backdrop-blur-md hover:bg-background"
                    :class="tabPositionClasses[side]"
                    :data-test="`${side}-scene-panel-tab`"
                    :aria-label="`Open ${title}`"
                    @click="open = true"
                >
                    <slot name="tab" />
                </Button>
            </TooltipTrigger>
            <TooltipContent :side="side === 'left' ? 'right' : 'left'">
                {{ title }}
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
</template>
