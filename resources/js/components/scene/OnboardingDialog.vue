<script setup lang="ts">
import { Save, Search } from '@lucide/vue';
import { computed, ref } from 'vue';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAddressSearch } from '@/composables/useAddressSearch';
import type { GeocodedAddress } from '@/lib/map/geocode-address';
import type { PortalFrameCarbon } from '@/lib/portal-frame';
import type { PortalFrameDesign } from '@/types/portal-frame';
import type { ServerProject } from '@/types/scene';

export type OnboardingCreatePayload = {
    projectMode: 'existing' | 'new';
    newProjectName: string;
    /** Null when the user skips the (optional) map location. */
    location: GeocodedAddress | null;
};

const props = defineProps<{
    projects: ServerProject[];
    teamSlug: string | null;
    design: PortalFrameDesign;
    carbon: PortalFrameCarbon | null;
    designReady: boolean;
    isCreating: boolean;
    creationError: string | null;
}>();

const emit = defineEmits<{
    create: [payload: OnboardingCreatePayload];
}>();

const open = defineModel<boolean>('open', { required: true });
const projectSlug = defineModel<string | null>('projectSlug', {
    required: true,
});
const buildingName = defineModel<string>('buildingName', { required: true });

const step = ref<1 | 2>(1);
const projectMode = ref<'existing' | 'new'>(
    props.projects.length > 0 ? 'existing' : 'new',
);
const newProjectName = ref('My First Project');
const location = ref<GeocodedAddress | null>(null);

const {
    query: address,
    results: searchResults,
    error: searchError,
    isSearching,
    search: performSearch,
} = useAddressSearch({
    teamSlug: () => props.teamSlug,
    onSingleResult: selectLocation,
});

async function search(): Promise<void> {
    location.value = null;
    await performSearch();
}

function selectLocation(result: GeocodedAddress): void {
    location.value = result;
    address.value = result.label;
    searchResults.value = [];
}

const errorMessage = computed(() => searchError.value ?? props.creationError);

const canContinue = computed(
    () =>
        buildingName.value.trim().length > 0 &&
        (projectMode.value === 'existing'
            ? Boolean(projectSlug.value)
            : newProjectName.value.trim().length > 0),
);

function createBuilding(): void {
    emit('create', {
        projectMode: projectMode.value,
        newProjectName: newProjectName.value,
        location: location.value,
    });
}
</script>

<template>
    <Dialog v-model:open="open">
        <DialogContent class="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>
                    {{
                        step === 1
                            ? 'Create your first building'
                            : 'Create your first scheme'
                    }}
                </DialogTitle>
                <DialogDescription>
                    {{
                        step === 1
                            ? 'Give your building a name to get started. You can place it on the map now or later.'
                            : 'Confirm the starting design — this becomes the first saved scheme. You can fine-tune everything afterwards.'
                    }}
                </DialogDescription>
            </DialogHeader>

            <div v-if="step === 1" class="grid gap-4">
                <div v-if="projectMode === 'existing'" class="grid gap-2">
                    <Label for="onboarding-project">Project</Label>
                    <select
                        id="onboarding-project"
                        v-model="projectSlug"
                        class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                    >
                        <option
                            v-for="project in projects"
                            :key="project.slug"
                            :value="project.slug"
                        >
                            {{ project.name }}
                        </option>
                    </select>
                    <button
                        type="button"
                        class="justify-self-start text-xs text-muted-foreground hover:underline"
                        @click="projectMode = 'new'"
                    >
                        + Create a new project instead
                    </button>
                </div>

                <div v-else class="grid gap-2">
                    <Label for="onboarding-new-project">Project name</Label>
                    <Input
                        id="onboarding-new-project"
                        v-model="newProjectName"
                        placeholder="My First Project"
                    />
                    <button
                        v-if="projects.length > 0"
                        type="button"
                        class="justify-self-start text-xs text-muted-foreground hover:underline"
                        @click="projectMode = 'existing'"
                    >
                        Use an existing project instead
                    </button>
                </div>

                <div class="grid gap-2">
                    <Label for="onboarding-building-name">Building name</Label>
                    <Input
                        id="onboarding-building-name"
                        v-model="buildingName"
                        placeholder="e.g. Distribution shed"
                    />
                </div>

                <div class="grid gap-2">
                    <Label for="onboarding-address"
                        >Postcode or address (optional)</Label
                    >
                    <div class="flex gap-2">
                        <Input
                            id="onboarding-address"
                            v-model="address"
                            placeholder="e.g. SW1A 1AA"
                            @keydown.enter.prevent="search"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            :disabled="isSearching"
                            @click="search"
                        >
                            <Search class="size-4" />
                            {{ isSearching ? 'Searching…' : 'Search' }}
                        </Button>
                    </div>

                    <ul
                        v-if="searchResults.length > 1"
                        class="max-h-36 space-y-2 overflow-y-auto"
                    >
                        <li
                            v-for="(result, index) in searchResults"
                            :key="`${result.lng}-${result.lat}-${index}`"
                        >
                            <button
                                type="button"
                                class="w-full rounded-md border border-sidebar-border/70 px-3 py-2 text-left text-sm hover:bg-muted"
                                @click="selectLocation(result)"
                            >
                                {{ result.label }}
                            </button>
                        </li>
                    </ul>

                    <p
                        v-if="location"
                        class="rounded-md bg-muted/60 px-3 py-2 text-sm"
                    >
                        📍 {{ location.label }}
                    </p>
                </div>

                <p v-if="errorMessage" class="text-sm text-destructive">
                    {{ errorMessage }}
                </p>
            </div>

            <div v-else class="grid gap-3">
                <div class="grid grid-cols-2 gap-3 text-sm">
                    <div
                        class="rounded-md border border-sidebar-border/70 px-3 py-2"
                    >
                        <span class="text-muted-foreground">Span</span>
                        <div class="font-medium">{{ design.span }} m</div>
                    </div>
                    <div
                        class="rounded-md border border-sidebar-border/70 px-3 py-2"
                    >
                        <span class="text-muted-foreground">Eaves height</span>
                        <div class="font-medium">
                            {{ design.eavesHeight }} m
                        </div>
                    </div>
                    <div
                        class="rounded-md border border-sidebar-border/70 px-3 py-2"
                    >
                        <span class="text-muted-foreground">Length</span>
                        <div class="font-medium">
                            {{ design.buildingLength }} m
                        </div>
                    </div>
                    <div
                        class="rounded-md border border-sidebar-border/70 px-3 py-2"
                    >
                        <span class="text-muted-foreground">Bay spacing</span>
                        <div class="font-medium">{{ design.baySpacing }} m</div>
                    </div>
                </div>

                <div
                    v-if="carbon"
                    class="flex items-center justify-between rounded-md bg-muted/60 px-3 py-2 text-sm"
                >
                    <span class="text-muted-foreground">
                        Embodied carbon (SCORS {{ carbon.scorsBand }})
                    </span>
                    <span class="font-medium tabular-nums">
                        {{ carbon.carbonIntensityKgM2.toFixed(0) }}
                        kgCO₂e/m²
                    </span>
                </div>

                <p v-if="errorMessage" class="text-sm text-destructive">
                    {{ errorMessage }}
                </p>
            </div>

            <DialogFooter class="gap-2 sm:justify-between">
                <Button
                    type="button"
                    variant="ghost"
                    @click="step === 1 ? (open = false) : (step = 1)"
                >
                    {{ step === 1 ? 'Skip for now' : 'Back' }}
                </Button>

                <Button
                    v-if="step === 1"
                    type="button"
                    :disabled="!canContinue"
                    @click="step = 2"
                >
                    Continue
                </Button>
                <Button
                    v-else
                    type="button"
                    :disabled="isCreating || !designReady"
                    @click="createBuilding"
                >
                    <Save class="size-4" />
                    {{ isCreating ? 'Creating…' : 'Create building & scheme' }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
