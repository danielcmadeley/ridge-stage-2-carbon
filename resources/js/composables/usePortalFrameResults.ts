import { computed, toValue } from 'vue';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';
import {
    analyzeGoverningPortalFrame,
    buildPortalFrame,
    calculatePortalFrameCarbon,
    sizeFoundationReactions,
} from '@/lib/portal-frame';
import type {
    FoundationSizingResult,
    PortalFrameCarbon,
    SupportReaction,
} from '@/lib/portal-frame';
import type { BuiltPortalFrame } from '@/lib/portal-frame/model/geometry-builder';
import type { PortalFrameDesign } from '@/types/portal-frame';

export type SupportReactions = {
    left: SupportReaction;
    right: SupportReaction;
};

export type FoundationSizingBySide = {
    left: FoundationSizingResult;
    right: FoundationSizingResult;
};

export type FoundationSizingEntry = {
    side: 'left' | 'right';
    result: FoundationSizingResult;
};

export type UsePortalFrameResultsReturn = {
    resolvedFrame: ComputedRef<BuiltPortalFrame | null>;
    frameError: ComputedRef<string | null>;
    baseReactions: ComputedRef<SupportReactions | null>;
    foundationSizing: ComputedRef<FoundationSizingBySide | null>;
    foundationSizingEntries: ComputedRef<FoundationSizingEntry[]>;
    carbon: ComputedRef<PortalFrameCarbon | null>;
};

/**
 * Derives every design result the editor needs from a portal frame design:
 * resolved sections, governing frame reactions, foundation sizing, and
 * embodied carbon. Each step degrades to null when the design is unbuildable
 * so the UI can render partial results.
 */
export function usePortalFrameResults(
    design: MaybeRefOrGetter<PortalFrameDesign>,
): UsePortalFrameResultsReturn {
    const frameResolution = computed(() => {
        try {
            return { frame: buildPortalFrame(toValue(design)), error: null };
        } catch (error) {
            return {
                frame: null,
                error:
                    error instanceof Error
                        ? error.message
                        : 'Could not resolve portal frame sections.',
            };
        }
    });

    const resolvedFrame = computed(() => frameResolution.value.frame);
    const frameError = computed(() => frameResolution.value.error);

    const baseReactions = computed(() => {
        if (!resolvedFrame.value) {
            return null;
        }

        try {
            return analyzeGoverningPortalFrame(
                resolvedFrame.value,
                toValue(design),
            ).reactions;
        } catch {
            return null;
        }
    });

    const foundationSizing = computed(() => {
        if (!baseReactions.value) {
            return null;
        }

        return sizeFoundationReactions(
            baseReactions.value,
            toValue(design),
            resolvedFrame.value?.column,
        );
    });

    const foundationSizingEntries = computed<FoundationSizingEntry[]>(() => {
        if (!foundationSizing.value) {
            return [];
        }

        return [
            { side: 'left', result: foundationSizing.value.left },
            { side: 'right', result: foundationSizing.value.right },
        ];
    });

    const carbon = computed(() => {
        if (!resolvedFrame.value) {
            return null;
        }

        try {
            return calculatePortalFrameCarbon(toValue(design));
        } catch {
            return null;
        }
    });

    return {
        resolvedFrame,
        frameError,
        baseReactions,
        foundationSizing,
        foundationSizingEntries,
        carbon,
    };
}
