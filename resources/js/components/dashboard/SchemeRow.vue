<script setup lang="ts">
import { Form, Link, router } from '@inertiajs/vue3';
import {
    BadgeCheck,
    Layers,
    Leaf,
    MapPin,
    Pencil,
    Trash2,
    Undo2,
} from '@lucide/vue';
import SchemeController from '@/actions/App/Http/Controllers/SchemeController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { scene } from '@/routes';
import type { ServerScheme } from '@/types/scene';

const props = defineProps<{
    teamSlug: string;
    projectSlug: string;
    buildingSlug: string;
    scheme: ServerScheme;
    isLowestCarbon: boolean;
}>();

const emit = defineEmits<{
    rename: [];
}>();

const sceneHref = scene(
    { current_team: props.teamSlug },
    {
        query: {
            building: props.buildingSlug,
            scheme: String(props.scheme.id),
        },
    },
);

const toggleStatus = (): void => {
    router.patch(
        SchemeController.update.url({
            current_team: props.teamSlug,
            project: props.projectSlug,
            building: props.buildingSlug,
            scheme: props.scheme.id,
        }),
        { status: props.scheme.status === 'verified' ? 'draft' : 'verified' },
        { preserveScroll: true },
    );
};
</script>

<template>
    <div
        class="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 dark:bg-card"
        :class="
            scheme.status === 'verified'
                ? 'ring-1 ring-ridge-green/40'
                : 'ring-1 ring-ridge-green/10 dark:ring-border'
        "
    >
        <div class="flex min-w-0 items-center gap-2">
            <BadgeCheck
                v-if="scheme.status === 'verified'"
                class="size-4 shrink-0 text-ridge-green dark:text-emerald-400"
            />
            <Layers
                v-else
                class="size-4 shrink-0 text-ridge-green/50 dark:text-muted-foreground"
            />
            <span
                class="truncate text-sm"
                :class="scheme.status === 'verified' ? 'font-medium' : ''"
            >
                {{ scheme.name ?? 'Untitled scheme' }}
            </span>
            <Badge
                v-if="scheme.status === 'verified'"
                class="shrink-0 rounded-full border-transparent bg-ridge-green text-white capitalize"
            >
                Verified
            </Badge>
            <Badge
                v-else
                variant="secondary"
                class="shrink-0 rounded-full font-light capitalize"
            >
                {{ scheme.status }}
            </Badge>
            <Badge
                v-if="isLowestCarbon"
                variant="outline"
                class="shrink-0 gap-1 rounded-full border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400"
            >
                <Leaf class="size-3" />
                Lowest carbon
            </Badge>
            <span
                v-if="scheme.carbon.carbonIntensityKgM2 != null"
                class="shrink-0 text-xs font-light text-ridge-green/60 dark:text-muted-foreground"
            >
                {{ Math.round(scheme.carbon.carbonIntensityKgM2) }}
                kgCO₂e/m²
            </span>
        </div>
        <div class="flex shrink-0 items-center gap-1">
            <Button
                variant="outline"
                size="sm"
                class="rounded-full border-ridge-green/20 text-ridge-green hover:bg-ridge-green/5 hover:text-ridge-green dark:border-border dark:text-foreground dark:hover:bg-accent dark:hover:text-foreground"
                @click="toggleStatus"
            >
                <Undo2 v-if="scheme.status === 'verified'" class="size-4" />
                <BadgeCheck v-else class="size-4" />
                {{ scheme.status === 'verified' ? 'Mark draft' : 'Verify' }}
            </Button>
            <Button
                as-child
                variant="ghost"
                size="sm"
                class="rounded-full hover:bg-ridge-green/10"
            >
                <Link :href="sceneHref">
                    <MapPin class="size-4" />
                    Open
                </Link>
            </Button>
            <Button
                variant="ghost"
                size="icon"
                class="size-8 rounded-full hover:bg-ridge-green/10"
                aria-label="Rename scheme"
                @click="emit('rename')"
            >
                <Pencil class="size-4" />
            </Button>
            <Form
                v-bind="
                    SchemeController.destroy.form.delete({
                        current_team: teamSlug,
                        project: projectSlug,
                        building: buildingSlug,
                        scheme: scheme.id,
                    })
                "
                v-slot="{}"
            >
                <Button
                    type="submit"
                    variant="ghost"
                    size="icon"
                    class="size-8 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Delete scheme"
                >
                    <Trash2 class="size-4" />
                </Button>
            </Form>
        </div>
    </div>
</template>
