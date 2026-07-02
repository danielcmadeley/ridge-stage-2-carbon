<script setup lang="ts">
import { Form, Link } from '@inertiajs/vue3';
import {
    Building2,
    ChevronDown,
    MapPin,
    Pencil,
    Plus,
    Trash2,
} from '@lucide/vue';
import { computed, ref } from 'vue';
import BuildingController from '@/actions/App/Http/Controllers/BuildingController';
import SchemeRow from '@/components/dashboard/SchemeRow.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { scene } from '@/routes';
import type { ServerBuilding, ServerScheme } from '@/types/scene';

const props = defineProps<{
    teamSlug: string;
    projectSlug: string;
    building: ServerBuilding;
}>();

const emit = defineEmits<{
    edit: [];
    createScheme: [];
    renameScheme: [scheme: ServerScheme];
}>();

const open = ref(false);

const sceneHref = scene(
    { current_team: props.teamSlug },
    { query: { building: props.building.slug } },
);

/**
 * The scheme with the lowest carbon intensity, only meaningful when there is
 * more than one scheme to compare.
 */
const lowestCarbonSchemeId = computed<number | null>(() => {
    const comparable = props.building.schemes.filter(
        (scheme) => scheme.carbon.carbonIntensityKgM2 != null,
    );

    if (comparable.length < 2) {
        return null;
    }

    return comparable.reduce((lowest, scheme) =>
        scheme.carbon.carbonIntensityKgM2! < lowest.carbon.carbonIntensityKgM2!
            ? scheme
            : lowest,
    ).id;
});
</script>

<template>
    <Collapsible :open="open" @update:open="open = !open">
        <div class="rounded-xl bg-ridge-grey/35 dark:bg-muted/40">
            <div class="flex items-center justify-between gap-2 p-3 md:px-4">
                <CollapsibleTrigger as-child>
                    <button
                        type="button"
                        class="flex min-w-0 items-center gap-2 text-left"
                        :aria-expanded="open"
                    >
                        <ChevronDown
                            class="size-4 shrink-0 text-ridge-green/50 transition-transform dark:text-muted-foreground"
                            :class="open ? '' : '-rotate-90'"
                        />
                        <Building2
                            class="size-4 shrink-0 text-ridge-green/50 dark:text-muted-foreground"
                        />
                        <span class="truncate text-sm font-medium">{{
                            building.name
                        }}</span>
                        <Badge
                            variant="outline"
                            class="shrink-0 rounded-full border-ridge-green/20 font-light text-ridge-green/70 dark:border-border dark:text-muted-foreground"
                        >
                            {{ building.schemes.length }}
                            scheme(s)
                        </Badge>
                    </button>
                </CollapsibleTrigger>
                <div class="flex shrink-0 items-center gap-1">
                    <Button
                        as-child
                        size="sm"
                        class="rounded-full bg-ridge-green text-white hover:bg-ridge-green/90"
                    >
                        <Link :href="sceneHref">
                            <MapPin class="size-4" />
                            Open in scene
                        </Link>
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        class="size-8 rounded-full hover:bg-ridge-green/10"
                        aria-label="Edit building"
                        @click="emit('edit')"
                    >
                        <Pencil class="size-4" />
                    </Button>
                    <Form
                        v-bind="
                            BuildingController.destroy.form.delete({
                                current_team: teamSlug,
                                project: projectSlug,
                                building: building.slug,
                            })
                        "
                        v-slot="{}"
                    >
                        <Button
                            type="submit"
                            variant="ghost"
                            size="icon"
                            class="size-8 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                            aria-label="Delete building"
                        >
                            <Trash2 class="size-4" />
                        </Button>
                    </Form>
                </div>
            </div>

            <CollapsibleContent>
                <div class="flex flex-col gap-2 p-3 pt-0 md:px-4 md:pb-4">
                    <div
                        v-if="building.schemes.length === 0"
                        class="text-sm font-light text-ridge-green/60 dark:text-muted-foreground"
                    >
                        No schemes yet.
                    </div>

                    <SchemeRow
                        v-for="scheme in building.schemes"
                        :key="scheme.id"
                        :team-slug="teamSlug"
                        :project-slug="projectSlug"
                        :building-slug="building.slug"
                        :scheme="scheme"
                        :is-lowest-carbon="scheme.id === lowestCarbonSchemeId"
                        @rename="emit('renameScheme', scheme)"
                    />

                    <Button
                        variant="ghost"
                        size="sm"
                        class="w-fit rounded-full text-ridge-green/70 hover:bg-ridge-green/10 hover:text-ridge-green dark:text-muted-foreground dark:hover:text-foreground"
                        @click="emit('createScheme')"
                    >
                        <Plus class="size-4" />
                        Add scheme
                    </Button>
                </div>
            </CollapsibleContent>
        </div>
    </Collapsible>
</template>
