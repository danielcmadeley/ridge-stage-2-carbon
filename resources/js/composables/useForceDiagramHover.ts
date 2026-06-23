import { useTresContext } from '@tresjs/core';
import type { Group } from 'three';
import { Raycaster, Vector2, Vector3 } from 'three';
import { computed, onUnmounted, ref, watch, type ComputedRef, type ShallowRef } from 'vue';
import {
    collectForceDiagramObjects,
    resolveForceDiagramHover,
    type ForceDiagramHoverInfo,
} from '@/lib/portal-frame/force-diagram-hover';

type UseForceDiagramHoverOptions = {
    enabled: ComputedRef<boolean>;
    frameGroup: ShallowRef<Group>;
    lineThresholdM: ComputedRef<number>;
};

export function useForceDiagramHover(options: UseForceDiagramHoverOptions): {
    hoverInfo: ReturnType<typeof ref<ForceDiagramHoverInfo | null>>;
} {
    const { camera, renderer } = useTresContext();
    const hoverInfo = ref<ForceDiagramHoverInfo | null>(null);
    const raycaster = new Raycaster();
    const pointer = new Vector2();
    const localPoint = new Vector3();

    const diagramTargets = computed(() => collectForceDiagramObjects(options.frameGroup.value));

    watch(
        () => options.enabled.value,
        (enabled) => {
            if (!enabled) {
                hoverInfo.value = null;
            }
        },
    );

    watch(
        () => options.frameGroup.value,
        () => {
            hoverInfo.value = null;
        },
    );

    watch(
        [() => options.enabled.value, () => renderer.instance.domElement] as const,
        ([enabled, domElement], _, onCleanup) => {
            if (!enabled) {
                return;
            }

            function clearHover(): void {
                hoverInfo.value = null;
            }

            function updateHover(event: PointerEvent): void {
                const activeCamera = camera.activeCamera.value;
                const targets = diagramTargets.value;

                if (!activeCamera || targets.length === 0) {
                    clearHover();
                    return;
                }

                const rect = domElement.getBoundingClientRect();

                if (rect.width === 0 || rect.height === 0) {
                    clearHover();
                    return;
                }

                pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
                pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

                raycaster.setFromCamera(pointer, activeCamera);
                raycaster.params.Line.threshold = options.lineThresholdM.value;

                const intersections = raycaster.intersectObjects(targets, false);

                if (intersections.length === 0) {
                    clearHover();
                    return;
                }

                options.frameGroup.value.worldToLocal(
                    localPoint.copy(intersections[0].point),
                );

                hoverInfo.value =
                    resolveForceDiagramHover(
                        intersections[0],
                        localPoint,
                        event.clientX - rect.left,
                        event.clientY - rect.top,
                    ) ?? null;
            }

            domElement.addEventListener('pointermove', updateHover);
            domElement.addEventListener('pointerleave', clearHover);

            onCleanup(() => {
                domElement.removeEventListener('pointermove', updateHover);
                domElement.removeEventListener('pointerleave', clearHover);
                clearHover();
            });
        },
        { immediate: true },
    );

    onUnmounted(() => {
        hoverInfo.value = null;
    });

    return { hoverInfo };
}
