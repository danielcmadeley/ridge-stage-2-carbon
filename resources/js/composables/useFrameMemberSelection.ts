import { useTresContext } from '@tresjs/core';
import type { Group } from 'three';
import { Raycaster, Vector2 } from 'three';
import { computed, onUnmounted, ref, watch } from 'vue';
import type { ComputedRef, ShallowRef } from 'vue';
import {
    applyFrameMemberHighlight,
    collectFrameMemberPickTargets,
    resolveFrameMemberPick,
} from '@/lib/portal-frame/rendering/member-selection';
import type { FrameMember } from '@/types/portal-frame';

const CLICK_DRAG_TOLERANCE_PX = 5;

type UseFrameMemberSelectionOptions = {
    enabled: ComputedRef<boolean>;
    frameGroup: ShallowRef<Group>;
};

export function useFrameMemberSelection(
    options: UseFrameMemberSelectionOptions,
): {
    hoveredMember: ReturnType<typeof ref<FrameMember | null>>;
    selectedMember: ReturnType<typeof ref<FrameMember | null>>;
} {
    const { camera, renderer } = useTresContext();
    const hoveredMember = ref<FrameMember | null>(null);
    const selectedMember = ref<FrameMember | null>(null);
    const raycaster = new Raycaster();
    const pointer = new Vector2();

    const pickTargets = computed(() =>
        collectFrameMemberPickTargets(options.frameGroup.value),
    );

    function refreshHighlight(): void {
        applyFrameMemberHighlight(
            options.frameGroup.value,
            hoveredMember.value?.id ?? null,
            selectedMember.value?.id ?? null,
        );
        renderer.invalidate();
    }

    function setHovered(member: FrameMember | null): void {
        if (hoveredMember.value?.id === (member?.id ?? null)) {
            return;
        }

        hoveredMember.value = member;
        renderer.instance.domElement.style.cursor = member ? 'pointer' : '';
        refreshHighlight();
    }

    function setSelected(member: FrameMember | null): void {
        selectedMember.value = member;
        refreshHighlight();
    }

    function pickMemberAt(event: MouseEvent): FrameMember | null {
        const activeCamera = camera.activeCamera.value;
        const targets = pickTargets.value;
        const domElement = renderer.instance.domElement;

        if (!activeCamera || targets.length === 0) {
            return null;
        }

        const rect = domElement.getBoundingClientRect();

        if (rect.width === 0 || rect.height === 0) {
            return null;
        }

        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(pointer, activeCamera);

        const intersections = raycaster.intersectObjects(targets, false);

        if (intersections.length === 0) {
            return null;
        }

        // The slab is a pick target purely as an occluder: a slab hit means
        // the pointer is not on a member.
        return resolveFrameMemberPick(intersections[0]);
    }

    watch(
        () => options.enabled.value,
        (enabled) => {
            if (!enabled) {
                setHovered(null);
                setSelected(null);
            }
        },
    );

    watch(
        () => options.frameGroup.value,
        () => {
            setHovered(null);
            setSelected(null);
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

            let pointerDownAt: { x: number; y: number } | null = null;

            function handlePointerDown(event: PointerEvent): void {
                pointerDownAt = { x: event.clientX, y: event.clientY };
            }

            function handlePointerMove(event: PointerEvent): void {
                setHovered(pickMemberAt(event));
            }

            function handlePointerLeave(): void {
                setHovered(null);
            }

            function handleClick(event: MouseEvent): void {
                // Ignore clicks that end an orbit drag.
                if (
                    pointerDownAt &&
                    Math.hypot(
                        event.clientX - pointerDownAt.x,
                        event.clientY - pointerDownAt.y,
                    ) > CLICK_DRAG_TOLERANCE_PX
                ) {
                    return;
                }

                const picked = pickMemberAt(event);

                setSelected(
                    picked && picked.id === selectedMember.value?.id
                        ? null
                        : picked,
                );
            }

            domElement.addEventListener('pointerdown', handlePointerDown);
            domElement.addEventListener('pointermove', handlePointerMove);
            domElement.addEventListener('pointerleave', handlePointerLeave);
            domElement.addEventListener('click', handleClick);

            onCleanup(() => {
                domElement.removeEventListener(
                    'pointerdown',
                    handlePointerDown,
                );
                domElement.removeEventListener(
                    'pointermove',
                    handlePointerMove,
                );
                domElement.removeEventListener(
                    'pointerleave',
                    handlePointerLeave,
                );
                domElement.removeEventListener('click', handleClick);
                domElement.style.cursor = '';
                setHovered(null);
                setSelected(null);
            });
        },
        { immediate: true },
    );

    onUnmounted(() => {
        hoveredMember.value = null;
        selectedMember.value = null;
    });

    return { hoveredMember, selectedMember };
}
