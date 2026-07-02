<script setup lang="ts">
import { Save } from '@lucide/vue';
import { computed } from 'vue';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { ServerProject } from '@/types/scene';

const props = defineProps<{
    projects: ServerProject[];
    isSaving: boolean;
    saveError: string | null;
    saveSuccess: boolean;
    designReady: boolean;
    isUpdate: boolean;
}>();

const emit = defineEmits<{
    save: [];
}>();

const open = defineModel<boolean>('open', { required: true });
const projectSlug = defineModel<string | null>('projectSlug', {
    required: true,
});
const buildingName = defineModel<string>('buildingName', { required: true });

const hasProjects = computed(() => props.projects.length > 0);
</script>

<template>
    <Dialog v-model:open="open">
        <DialogContent class="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>Save building to project</DialogTitle>
                <DialogDescription>
                    Choose a project and name for this building. A map location
                    is optional — you can place it later.
                </DialogDescription>
            </DialogHeader>

            <div class="grid gap-4 py-2">
                <p v-if="!hasProjects" class="text-sm text-muted-foreground">
                    Create a project first to save this building.
                </p>

                <template v-else>
                    <div class="grid gap-2">
                        <Label for="save-project">Project</Label>
                        <Select v-model="projectSlug" :disabled="isSaving">
                            <SelectTrigger id="save-project">
                                <SelectValue placeholder="Select a project" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem
                                    v-for="project in projects"
                                    :key="project.slug"
                                    :value="project.slug"
                                >
                                    {{ project.name }}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div class="grid gap-2">
                        <Label for="building-name">Building name</Label>
                        <Input
                            id="building-name"
                            v-model="buildingName"
                            placeholder="e.g. Distribution shed"
                            :disabled="isSaving"
                        />
                    </div>

                    <Button
                        type="button"
                        class="w-full"
                        :disabled="isSaving || !projectSlug || !designReady"
                        @click="emit('save')"
                    >
                        <Save class="size-4" />
                        {{
                            isSaving
                                ? 'Saving…'
                                : isUpdate
                                  ? 'Update saved building'
                                  : 'Save building'
                        }}
                    </Button>

                    <p
                        v-if="!designReady"
                        class="text-xs text-muted-foreground"
                    >
                        The design is not ready to save yet.
                    </p>

                    <p v-if="saveError" class="text-sm text-destructive">
                        {{ saveError }}
                    </p>
                    <p
                        v-else-if="saveSuccess"
                        class="text-sm text-emerald-600 dark:text-emerald-400"
                    >
                        Building saved.
                    </p>
                </template>
            </div>
        </DialogContent>
    </Dialog>
</template>
