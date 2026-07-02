import { useTresContext } from '@tresjs/core';
import type { Group } from 'three';
import { Raycaster, Vector2, Vector3 } from 'three';
import { computed, onUnmounted, ref, watch } from 'vue';
import type { ComputedRef, ShallowRef } from 'vue';
import { columnGridLayout } from '@/lib/portal-frame/rendering/column-grid/column-grid-layout';
import {
    applyColumnGridLineHighlight,
    collectColumnGridLines,
    mountColumnGridSelectionOverlay,
    removeColumnGridSelectionOverlay,
    resolveColumnGridLineSelection,
} from '@/lib/portal-frame/rendering/column-grid/column-grid-overlay';
import type { ColumnGridSelection } from '@/lib/portal-frame/rendering/column-grid/column-grid-selection';
import type { PortalFrameDesign } from '@/types/portal-frame';

type UseColumnGridSelectionOptions = {
    enabled: ComputedRef<boolean>;
    frameGroup: ShallowRef<Group>;
    design: ComputedRef<PortalFrameDesign>;
    lineThresholdM: ComputedRef<number>;
};

export function useColumnGridSelection(
    options: UseColumnGridSelectionOptions,
): {
    selection: ReturnType<typeof ref<ColumnGridSelection | null>>;
} {
    const { camera, renderer } = useTresContext();
    const selection = ref<ColumnGridSelection | null>(null);
    const raycaster = new Raycaster();
    const pointer = new Vector2();
    const localPoint = new Vector3();

    const gridLines = computed(() =>
        collectColumnGridLines(options.frameGroup.value),
    );

    function applySelection(next: ColumnGridSelection | null): void {
        selection.value = next;
        applyColumnGridLineHighlight(options.frameGroup.value, next);

        removeColumnGridSelectionOverlay(options.frameGroup.value);

        if (next) {
            mountColumnGridSelectionOverlay(
                options.frameGroup.value,
                columnGridLayout(options.design.value),
                next,
            );
        }

        renderer.invalidate();
    }

    watch(
        () => options.enabled.value,
        (enabled) => {
            if (!enabled) {
                applySelection(null);
            }
        },
    );

    watch(
        () => options.frameGroup.value,
        () => {
            applySelection(null);
        },
    );

    watch(
        [
            () => options.enabled.value,
            () => renderer.instance.domElement,
        ] as const,
        ([enabled, domElement], _, onCleanup) => {
            if (!enabled) {
                return;
            }

            function handleClick(event: MouseEvent): void {
                const activeCamera = camera.activeCamera.value;
                const targets = gridLines.value;

                if (!activeCamera || targets.length === 0) {
                    applySelection(null);

                    return;
                }

                const rect = domElement.getBoundingClientRect();

                if (rect.width === 0 || rect.height === 0) {
                    return;
                }

                pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
                pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

                raycaster.setFromCamera(pointer, activeCamera);
                raycaster.params.Line.threshold = options.lineThresholdM.value;

                const intersections = raycaster.intersectObjects(
                    targets,
                    false,
                );

                if (intersections.length === 0) {
                    applySelection(null);

                    return;
                }

                const meta = resolveColumnGridLineSelection(intersections[0]);

                if (!meta) {
                    applySelection(null);

                    return;
                }

                options.frameGroup.value.worldToLocal(
                    localPoint.copy(intersections[0].point),
                );

                const current = selection.value;

                if (
                    current &&
                    current.axis === meta.axis &&
                    current.index === meta.index
                ) {
                    applySelection(null);

                    return;
                }

                applySelection({
                    ...meta,
                    anchorX: localPoint.x,
                    anchorY: localPoint.y,
                });
            }

            domElement.addEventListener('click', handleClick);

            onCleanup(() => {
                domElement.removeEventListener('click', handleClick);
                applySelection(null);
            });
        },
        { immediate: true },
    );

    onUnmounted(() => {
        applySelection(null);
    });

    return { selection };
}
