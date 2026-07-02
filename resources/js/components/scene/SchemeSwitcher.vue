<script setup lang="ts">
import { Form } from '@inertiajs/vue3';
import { Check, ChevronsUpDown, Layers, Plus } from '@lucide/vue';
import { computed, ref } from 'vue';
import SchemeController from '@/actions/App/Http/Controllers/SchemeController';
import InputError from '@/components/shared/InputError.vue';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { schemeVersionLabel } from '@/lib/building/building-statistics';
import type {
    ServerBuilding,
    ServerProject,
    ServerScheme,
} from '@/types/scene';

const props = defineProps<{
    teamSlug: string;
    project: ServerProject;
    building: ServerBuilding;
    activeSchemeId: number | null;
}>();

const emit = defineEmits<{
    select: [scheme: ServerScheme];
    created: [];
}>();

const createDialogOpen = ref(false);

const activeLabel = computed(() => {
    const activeScheme =
        props.building.schemes.find(
            (scheme) => scheme.id === props.activeSchemeId,
        ) ?? null;

    return schemeVersionLabel(
        activeScheme,
        props.building,
        props.activeSchemeId === null,
    );
});

function selectScheme(scheme: ServerScheme): void {
    if (scheme.id === props.activeSchemeId) {
        return;
    }

    emit('select', scheme);
}

function handleSchemeCreated(): void {
    createDialogOpen.value = false;
    emit('created');
}
</script>

<template>
    <DropdownMenu>
        <DropdownMenuTrigger as-child>
            <Button
                type="button"
                variant="ghost"
                class="h-9 max-w-[11rem] shrink gap-1 rounded-full px-3"
                data-test="scheme-switcher-trigger"
            >
                <Layers class="size-4 shrink-0" />
                <span class="truncate text-sm">{{ activeLabel }}</span>
                <ChevronsUpDown class="size-3 shrink-0 opacity-50" />
            </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
            align="center"
            class="w-56"
            data-test="scheme-switcher-menu"
        >
            <DropdownMenuLabel class="text-xs text-muted-foreground">
                Schemes
            </DropdownMenuLabel>

            <DropdownMenuItem
                v-for="scheme in building.schemes"
                :key="scheme.id"
                class="cursor-pointer gap-2"
                data-test="scheme-switcher-item"
                @click="selectScheme(scheme)"
            >
                <span class="truncate">
                    {{ schemeVersionLabel(scheme, building, false) }}
                </span>
                <Check
                    v-if="scheme.id === activeSchemeId"
                    class="ml-auto size-4"
                />
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
                class="cursor-pointer gap-2"
                data-test="scheme-switcher-new-scheme"
                @select.prevent="createDialogOpen = true"
            >
                <Plus class="size-4" />
                <span class="text-muted-foreground">New scheme</span>
            </DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>

    <Dialog v-model:open="createDialogOpen">
        <DialogContent class="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>New scheme</DialogTitle>
                <DialogDescription>
                    Create a draft scheme on {{ building.name }}.
                </DialogDescription>
            </DialogHeader>

            <Form
                v-bind="
                    SchemeController.store.form({
                        current_team: teamSlug,
                        project: project.slug,
                        building: building.slug,
                    })
                "
                v-slot="{ errors, processing }"
                class="flex flex-col gap-4"
                @success="handleSchemeCreated"
            >
                <div class="grid gap-2">
                    <Label for="scheme-name">Name (optional)</Label>
                    <Input id="scheme-name" name="name" />
                    <InputError :message="errors.name" />
                </div>

                <DialogFooter>
                    <Button type="submit" :disabled="processing">
                        Create scheme
                    </Button>
                </DialogFooter>
            </Form>
        </DialogContent>
    </Dialog>
</template>
