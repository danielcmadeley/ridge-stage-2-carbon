<script setup lang="ts">
import { Form } from '@inertiajs/vue3';
import { ChevronDown, Plus, Trash2 } from '@lucide/vue';
import { ref } from 'vue';
import ProjectController from '@/actions/App/Http/Controllers/ProjectController';
import BuildingCard from '@/components/dashboard/BuildingCard.vue';
import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type {
    ServerBuilding,
    ServerProject,
    ServerScheme,
} from '@/types/scene';

defineProps<{
    teamSlug: string;
    project: ServerProject;
}>();

const emit = defineEmits<{
    createBuilding: [];
    editBuilding: [building: ServerBuilding];
    createScheme: [building: ServerBuilding];
    renameScheme: [building: ServerBuilding, scheme: ServerScheme];
}>();

const open = ref(true);
</script>

<template>
    <article
        class="rounded-2xl border border-ridge-green/10 bg-white shadow-[0_8px_30px_rgba(0,55,35,0.05)] dark:border-border dark:bg-card dark:shadow-none"
    >
        <Collapsible :open="open" @update:open="open = !open">
            <div class="flex items-center justify-between gap-4 p-5 md:px-6">
                <div class="min-w-0">
                    <CollapsibleTrigger as-child>
                        <button
                            type="button"
                            class="flex items-center gap-2 text-left"
                            :aria-expanded="open"
                        >
                            <ChevronDown
                                class="size-4 shrink-0 text-ridge-green/50 transition-transform dark:text-muted-foreground"
                                :class="open ? '' : '-rotate-90'"
                            />
                            <span
                                class="ridge-display truncate text-lg leading-[1.2]"
                                >{{ project.name }}</span
                            >
                        </button>
                    </CollapsibleTrigger>
                    <p
                        class="ml-6 truncate text-sm font-light text-ridge-green/60 dark:text-muted-foreground"
                    >
                        <span v-if="project.client">{{ project.client }}</span>
                        <span v-if="project.client && project.projectNumber">
                            ·
                        </span>
                        <span v-if="project.projectNumber">{{
                            project.projectNumber
                        }}</span>
                        <span v-if="!project.client && !project.projectNumber">
                            {{ (project.buildings ?? []).length }}
                            building(s)
                        </span>
                    </p>
                </div>
                <div class="flex shrink-0 items-center gap-1">
                    <Button
                        variant="outline"
                        size="sm"
                        class="rounded-full border-ridge-green/20 text-ridge-green hover:bg-ridge-green/5 hover:text-ridge-green dark:border-border dark:text-foreground dark:hover:bg-accent dark:hover:text-foreground"
                        @click="emit('createBuilding')"
                    >
                        <Plus class="size-4" /> Building
                    </Button>
                    <Form
                        v-bind="
                            ProjectController.destroy.form.delete({
                                current_team: teamSlug,
                                project: project.slug,
                            })
                        "
                        v-slot="{}"
                    >
                        <Button
                            type="submit"
                            variant="ghost"
                            size="icon"
                            class="size-8 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                            aria-label="Delete project"
                        >
                            <Trash2 class="size-4" />
                        </Button>
                    </Form>
                </div>
            </div>

            <CollapsibleContent>
                <div class="flex flex-col gap-3 px-5 pb-5 md:px-6 md:pb-6">
                    <div
                        v-if="(project.buildings ?? []).length === 0"
                        class="rounded-xl border border-dashed border-ridge-green/20 bg-ridge-grey/25 p-6 text-center text-sm font-light text-ridge-green/60 dark:border-border dark:bg-muted/30 dark:text-muted-foreground"
                    >
                        No buildings yet. Add one to start designing schemes.
                    </div>

                    <BuildingCard
                        v-for="building in project.buildings ?? []"
                        :key="building.slug"
                        :team-slug="teamSlug"
                        :project-slug="project.slug"
                        :building="building"
                        @edit="emit('editBuilding', building)"
                        @create-scheme="emit('createScheme', building)"
                        @rename-scheme="
                            (scheme) => emit('renameScheme', building, scheme)
                        "
                    />
                </div>
            </CollapsibleContent>
        </Collapsible>
    </article>
</template>
