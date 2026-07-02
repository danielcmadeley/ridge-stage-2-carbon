<script setup lang="ts">
import { Form, Head, Link, router, usePage } from '@inertiajs/vue3';
import {
    BadgeCheck,
    Building2,
    ChevronDown,
    Layers,
    Leaf,
    MapPin,
    Pencil,
    Plus,
    Settings,
    Trash2,
    Undo2,
    Users,
} from '@lucide/vue';
import { computed, ref } from 'vue';
import BuildingController from '@/actions/App/Http/Controllers/BuildingController';
import ProjectController from '@/actions/App/Http/Controllers/ProjectController';
import SchemeController from '@/actions/App/Http/Controllers/SchemeController';
import Heading from '@/components/shared/Heading.vue';
import InputError from '@/components/shared/InputError.vue';
import PendingInvitationsModal from '@/components/teams/PendingInvitationsModal.vue';
import TeamSwitcher from '@/components/teams/TeamSwitcher.vue';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
import { Separator } from '@/components/ui/separator';
import { scene } from '@/routes';
import { edit as editProfile } from '@/routes/profile';
import { edit as editTeam, switchMethod } from '@/routes/teams';
import type { DashboardInvitation, Team, User } from '@/types';
import type { ServerProject } from '@/types/scene';

withDefaults(
    defineProps<{
        projects: ServerProject[];
        pendingInvitations?: DashboardInvitation[];
    }>(),
    {
        pendingInvitations: () => [],
    },
);

const page = usePage();
const user = computed(() => page.props.auth?.user as User | undefined);
const currentTeam = computed(() => page.props.currentTeam as Team | undefined);
const teams = computed<Team[]>(() => (page.props.teams as Team[]) ?? []);

const teamSlug = computed(() => currentTeam.value?.slug ?? '');

const openProjects = ref<Record<string, boolean>>({});
const openBuildings = ref<Record<string, boolean>>({});

const toggleProject = (slug: string) => {
    openProjects.value[slug] = !openProjects.value[slug];
};
const toggleBuilding = (key: string) => {
    openBuildings.value[key] = !openBuildings.value[key];
};

// Building edit/create dialog state.
const buildingDialog = ref<{
    mode: 'create' | 'edit';
    project: ServerProject;
    building?: ServerBuildingLite;
} | null>(null);
type ServerBuildingLite = NonNullable<ServerProject['buildings']>[number];

// Scheme rename/create dialog state.
const schemeDialog = ref<{
    mode: 'create' | 'edit';
    project: ServerProject;
    building: ServerBuildingLite;
    scheme?: { id: number; name: string | null };
} | null>(null);

const projectDialogOpen = ref(false);

// The scheme with the lowest carbon intensity, only meaningful when there is
// more than one scheme to compare.
const lowestCarbonSchemeId = (building: ServerBuildingLite): number | null => {
    const comparable = building.schemes.filter(
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
};

const toggleSchemeStatus = (
    project: ServerProject,
    building: ServerBuildingLite,
    scheme: { id: number; status: string },
) => {
    router.patch(
        SchemeController.update.url({
            current_team: teamSlug.value,
            project: project.slug,
            building: building.slug,
            scheme: scheme.id,
        }),
        { status: scheme.status === 'verified' ? 'draft' : 'verified' },
        { preserveScroll: true },
    );
};

const sceneHref = (buildingSlug?: string, schemeId?: number) =>
    scene(
        { current_team: teamSlug.value },
        {
            query: {
                ...(buildingSlug ? { building: buildingSlug } : {}),
                ...(schemeId ? { scheme: String(schemeId) } : {}),
            },
        },
    );

const initials = (name?: string) =>
    (name ?? '??')
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

const switchTo = (team: Team) => {
    const previousSlug = currentTeam.value?.slug;

    router.visit(switchMethod({ team: team.slug }), {
        onFinish: () => {
            if (!previousSlug || typeof window === 'undefined') {
                router.reload();

                return;
            }

            const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
            const segment = `/${previousSlug}`;

            if (currentUrl.includes(segment)) {
                router.visit(currentUrl.replace(segment, `/${team.slug}`), {
                    replace: true,
                });

                return;
            }

            router.reload();
        },
    });
};
</script>

<template>
    <Head title="Dashboard" />

    <PendingInvitationsModal
        v-if="pendingInvitations?.length"
        :invitations="pendingInvitations"
    />

    <div class="flex flex-col gap-6 p-4 sm:p-6">
        <div class="flex flex-wrap items-end justify-between gap-4">
            <Heading
                title="Dashboard"
                :description="`Buildings and schemes for ${currentTeam?.name ?? 'your team'}.`"
            />
            <div class="flex items-center gap-2">
                <Button @click="projectDialogOpen = true">
                    <Plus class="size-4" />
                    New project
                </Button>
                <TeamSwitcher in-header />
            </div>
        </div>

        <!-- Account / team / teams summary -->
        <div class="grid gap-4 sm:grid-cols-3">
            <Card>
                <CardHeader>
                    <CardTitle class="flex items-center gap-2 text-base">
                        <Settings class="size-4" /> Your settings
                    </CardTitle>
                    <CardDescription
                        >Manage your profile and security.</CardDescription
                    >
                </CardHeader>
                <CardContent class="flex items-center gap-3">
                    <Avatar v-if="user" class="size-10">
                        <AvatarFallback>{{
                            initials(user.name)
                        }}</AvatarFallback>
                    </Avatar>
                    <div v-if="user" class="min-w-0 flex-1">
                        <p class="truncate text-sm font-medium">
                            {{ user.name }}
                        </p>
                        <p class="truncate text-xs text-muted-foreground">
                            {{ user.email }}
                        </p>
                    </div>
                    <Button as-child variant="outline" size="sm">
                        <Link :href="editProfile()" prefetch>
                            <Settings class="size-4" /> Settings
                        </Link>
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle class="flex items-center gap-2 text-base">
                        <Users class="size-4" /> The team
                    </CardTitle>
                    <CardDescription
                        >The team you are currently working in.</CardDescription
                    >
                </CardHeader>
                <CardContent class="flex flex-col gap-3">
                    <div class="flex items-center justify-between gap-2">
                        <div class="min-w-0">
                            <p class="truncate text-sm font-medium">
                                {{ currentTeam?.name ?? '—' }}
                            </p>
                            <p
                                v-if="currentTeam?.roleLabel"
                                class="text-xs text-muted-foreground"
                            >
                                {{ currentTeam.roleLabel }}
                            </p>
                        </div>
                        <Badge
                            v-if="currentTeam?.isPersonal"
                            variant="secondary"
                            >Personal</Badge
                        >
                    </div>
                    <Button as-child variant="outline" size="sm" class="w-full">
                        <Link
                            :href="editTeam({ team: currentTeam?.slug ?? '' })"
                        >
                            <Users class="size-4" /> Manage team
                        </Link>
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle class="flex items-center gap-2 text-base">
                        <Users class="size-4" /> Your teams
                    </CardTitle>
                    <CardDescription
                        >Switch between the teams you belong
                        to.</CardDescription
                    >
                </CardHeader>
                <CardContent class="flex flex-col gap-2">
                    <div
                        v-for="team in teams"
                        :key="team.id"
                        class="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                        :class="team.isCurrent ? 'bg-accent' : ''"
                    >
                        <div class="min-w-0">
                            <p class="truncate text-sm font-medium">
                                {{ team.name }}
                            </p>
                            <p
                                v-if="team.roleLabel"
                                class="text-xs text-muted-foreground"
                            >
                                {{ team.roleLabel }}
                            </p>
                        </div>
                        <Button
                            v-if="!team.isCurrent"
                            variant="ghost"
                            size="sm"
                            @click="switchTo(team)"
                        >
                            Switch
                        </Button>
                        <Badge v-else variant="secondary">Current</Badge>
                    </div>
                    <p
                        v-if="teams.length === 0"
                        class="text-sm text-muted-foreground"
                    >
                        No other teams.
                    </p>
                </CardContent>
            </Card>
        </div>

        <!-- Projects grouped with buildings + schemes -->
        <Separator />

        <div
            v-if="projects.length === 0"
            class="flex flex-col items-center gap-3 py-12 text-center"
        >
            <Building2 class="size-10 text-muted-foreground" />
            <p class="text-sm text-muted-foreground">
                No projects yet. Create your first project to start adding
                buildings.
            </p>
            <Button @click="projectDialogOpen = true">
                <Plus class="size-4" />
                Create project
            </Button>
        </div>

        <div v-else class="flex flex-col gap-4">
            <Card v-for="project in projects" :key="project.slug">
                <Collapsible
                    :open="openProjects[project.slug] ?? true"
                    @update:open="toggleProject(project.slug)"
                >
                    <CardHeader
                        class="flex-row items-center justify-between gap-4 space-y-0"
                    >
                        <div class="min-w-0">
                            <CollapsibleTrigger as-child>
                                <button
                                    type="button"
                                    class="flex items-center gap-2 text-left"
                                    :aria-expanded="
                                        openProjects[project.slug] ?? true
                                    "
                                >
                                    <ChevronDown
                                        class="size-4 text-muted-foreground transition-transform"
                                        :class="
                                            (openProjects[project.slug] ?? true)
                                                ? ''
                                                : '-rotate-90'
                                        "
                                    />
                                    <CardTitle class="truncate text-base">{{
                                        project.name
                                    }}</CardTitle>
                                </button>
                            </CollapsibleTrigger>
                            <CardDescription class="ml-6 truncate">
                                <span v-if="project.client">{{
                                    project.client
                                }}</span>
                                <span
                                    v-if="
                                        project.client && project.projectNumber
                                    "
                                >
                                    ·
                                </span>
                                <span v-if="project.projectNumber">{{
                                    project.projectNumber
                                }}</span>
                                <span
                                    v-if="
                                        !project.client &&
                                        !project.projectNumber
                                    "
                                >
                                    {{ (project.buildings ?? []).length }}
                                    building(s)
                                </span>
                            </CardDescription>
                        </div>
                        <div class="flex shrink-0 items-center gap-1">
                            <Button
                                variant="outline"
                                size="sm"
                                @click="
                                    buildingDialog = { mode: 'create', project }
                                "
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
                                    class="size-8 text-destructive"
                                    aria-label="Delete project"
                                >
                                    <Trash2 class="size-4" />
                                </Button>
                            </Form>
                        </div>
                    </CardHeader>

                    <CollapsibleContent>
                        <CardContent class="flex flex-col gap-3 pt-0">
                            <div
                                v-if="(project.buildings ?? []).length === 0"
                                class="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground"
                            >
                                No buildings yet. Add one to start designing
                                schemes.
                            </div>

                            <Collapsible
                                v-for="building in project.buildings ?? []"
                                :key="building.slug"
                                :open="
                                    openBuildings[
                                        `${project.slug}/${building.slug}`
                                    ] ?? false
                                "
                                @update:open="
                                    toggleBuilding(
                                        `${project.slug}/${building.slug}`,
                                    )
                                "
                            >
                                <div class="rounded-lg border">
                                    <div
                                        class="flex items-center justify-between gap-2 p-3"
                                    >
                                        <CollapsibleTrigger as-child>
                                            <button
                                                type="button"
                                                class="flex min-w-0 items-center gap-2 text-left"
                                                :aria-expanded="
                                                    openBuildings[
                                                        `${project.slug}/${building.slug}`
                                                    ] ?? false
                                                "
                                            >
                                                <ChevronDown
                                                    class="size-4 shrink-0 text-muted-foreground transition-transform"
                                                    :class="
                                                        (openBuildings[
                                                            `${project.slug}/${building.slug}`
                                                        ] ?? false)
                                                            ? ''
                                                            : '-rotate-90'
                                                    "
                                                />
                                                <Building2
                                                    class="size-4 shrink-0 text-muted-foreground"
                                                />
                                                <span
                                                    class="truncate text-sm font-medium"
                                                    >{{ building.name }}</span
                                                >
                                                <Badge
                                                    variant="outline"
                                                    class="shrink-0"
                                                >
                                                    {{
                                                        building.schemes.length
                                                    }}
                                                    scheme(s)
                                                </Badge>
                                            </button>
                                        </CollapsibleTrigger>
                                        <div
                                            class="flex shrink-0 items-center gap-1"
                                        >
                                            <Button
                                                as-child
                                                variant="outline"
                                                size="sm"
                                            >
                                                <Link
                                                    :href="
                                                        sceneHref(building.slug)
                                                    "
                                                >
                                                    <MapPin class="size-4" />
                                                    Open in scene
                                                </Link>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                class="size-8"
                                                aria-label="Edit building"
                                                @click="
                                                    buildingDialog = {
                                                        mode: 'edit',
                                                        project,
                                                        building,
                                                    }
                                                "
                                            >
                                                <Pencil class="size-4" />
                                            </Button>
                                            <Form
                                                v-bind="
                                                    BuildingController.destroy.form.delete(
                                                        {
                                                            current_team:
                                                                teamSlug,
                                                            project:
                                                                project.slug,
                                                            building:
                                                                building.slug,
                                                        },
                                                    )
                                                "
                                                v-slot="{}"
                                            >
                                                <Button
                                                    type="submit"
                                                    variant="ghost"
                                                    size="icon"
                                                    class="size-8 text-destructive"
                                                    aria-label="Delete building"
                                                >
                                                    <Trash2 class="size-4" />
                                                </Button>
                                            </Form>
                                        </div>
                                    </div>

                                    <CollapsibleContent>
                                        <Separator />
                                        <div class="flex flex-col gap-2 p-3">
                                            <div
                                                v-if="
                                                    building.schemes.length ===
                                                    0
                                                "
                                                class="text-sm text-muted-foreground"
                                            >
                                                No schemes yet.
                                            </div>

                                            <div
                                                v-for="scheme in building.schemes"
                                                :key="scheme.id"
                                                class="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                                                :class="
                                                    scheme.status === 'verified'
                                                        ? 'border-ridge-green bg-ridge-green/5 shadow-sm'
                                                        : ''
                                                "
                                            >
                                                <div
                                                    class="flex min-w-0 items-center gap-2"
                                                >
                                                    <BadgeCheck
                                                        v-if="
                                                            scheme.status ===
                                                            'verified'
                                                        "
                                                        class="size-4 shrink-0 text-ridge-green"
                                                    />
                                                    <Layers
                                                        v-else
                                                        class="size-4 shrink-0 text-muted-foreground"
                                                    />
                                                    <span
                                                        class="truncate text-sm"
                                                        :class="
                                                            scheme.status ===
                                                            'verified'
                                                                ? 'font-medium'
                                                                : ''
                                                        "
                                                    >
                                                        {{
                                                            scheme.name ??
                                                            'Untitled scheme'
                                                        }}
                                                    </span>
                                                    <Badge
                                                        v-if="
                                                            scheme.status ===
                                                            'verified'
                                                        "
                                                        class="shrink-0 border-transparent bg-ridge-green text-white capitalize"
                                                    >
                                                        Verified
                                                    </Badge>
                                                    <Badge
                                                        v-else
                                                        variant="secondary"
                                                        class="shrink-0 capitalize"
                                                    >
                                                        {{ scheme.status }}
                                                    </Badge>
                                                    <Badge
                                                        v-if="
                                                            scheme.id ===
                                                            lowestCarbonSchemeId(
                                                                building,
                                                            )
                                                        "
                                                        variant="outline"
                                                        class="shrink-0 gap-1 border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400"
                                                    >
                                                        <Leaf class="size-3" />
                                                        Lowest carbon
                                                    </Badge>
                                                    <span
                                                        v-if="
                                                            scheme.carbon
                                                                .carbonIntensityKgM2 !=
                                                            null
                                                        "
                                                        class="shrink-0 text-xs text-muted-foreground"
                                                    >
                                                        {{
                                                            Math.round(
                                                                scheme.carbon
                                                                    .carbonIntensityKgM2,
                                                            )
                                                        }}
                                                        kgCO₂e/m²
                                                    </span>
                                                </div>
                                                <div
                                                    class="flex shrink-0 items-center gap-1"
                                                >
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        @click="
                                                            toggleSchemeStatus(
                                                                project,
                                                                building,
                                                                scheme,
                                                            )
                                                        "
                                                    >
                                                        <Undo2
                                                            v-if="
                                                                scheme.status ===
                                                                'verified'
                                                            "
                                                            class="size-4"
                                                        />
                                                        <BadgeCheck
                                                            v-else
                                                            class="size-4"
                                                        />
                                                        {{
                                                            scheme.status ===
                                                            'verified'
                                                                ? 'Mark draft'
                                                                : 'Verify'
                                                        }}
                                                    </Button>
                                                    <Button
                                                        as-child
                                                        variant="ghost"
                                                        size="sm"
                                                    >
                                                        <Link
                                                            :href="
                                                                sceneHref(
                                                                    building.slug,
                                                                    scheme.id,
                                                                )
                                                            "
                                                        >
                                                            <MapPin
                                                                class="size-4"
                                                            />
                                                            Open
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        class="size-8"
                                                        aria-label="Rename scheme"
                                                        @click="
                                                            schemeDialog = {
                                                                mode: 'edit',
                                                                project,
                                                                building,
                                                                scheme: {
                                                                    id: scheme.id,
                                                                    name: scheme.name,
                                                                },
                                                            }
                                                        "
                                                    >
                                                        <Pencil
                                                            class="size-4"
                                                        />
                                                    </Button>
                                                    <Form
                                                        v-bind="
                                                            SchemeController.destroy.form.delete(
                                                                {
                                                                    current_team:
                                                                        teamSlug,
                                                                    project:
                                                                        project.slug,
                                                                    building:
                                                                        building.slug,
                                                                    scheme: scheme.id,
                                                                },
                                                            )
                                                        "
                                                        v-slot="{}"
                                                    >
                                                        <Button
                                                            type="submit"
                                                            variant="ghost"
                                                            size="icon"
                                                            class="size-8 text-destructive"
                                                            aria-label="Delete scheme"
                                                        >
                                                            <Trash2
                                                                class="size-4"
                                                            />
                                                        </Button>
                                                    </Form>
                                                </div>
                                            </div>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                class="w-fit"
                                                @click="
                                                    schemeDialog = {
                                                        mode: 'create',
                                                        project,
                                                        building,
                                                    }
                                                "
                                            >
                                                <Plus class="size-4" /> Add
                                                scheme
                                            </Button>
                                        </div>
                                    </CollapsibleContent>
                                </div>
                            </Collapsible>
                        </CardContent>
                    </CollapsibleContent>
                </Collapsible>
            </Card>
        </div>
    </div>

    <!-- Project create dialog -->
    <Dialog v-model:open="projectDialogOpen">
        <DialogContent class="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>New project</DialogTitle>
                <DialogDescription>
                    Create a project to start saving buildings and design
                    schemes.
                </DialogDescription>
            </DialogHeader>

            <Form
                v-bind="
                    ProjectController.store.form({ current_team: teamSlug })
                "
                v-slot="{ errors, processing }"
                class="flex flex-col gap-4"
                @success="projectDialogOpen = false"
            >
                <div class="grid gap-4 sm:grid-cols-2">
                    <div class="grid gap-2 sm:col-span-2">
                        <Label for="project-name">Name</Label>
                        <Input
                            id="project-name"
                            name="name"
                            placeholder="Riverside Depot"
                            required
                        />
                        <InputError :message="errors.name" />
                    </div>
                    <div class="grid gap-2">
                        <Label for="project-client">Client (optional)</Label>
                        <Input
                            id="project-client"
                            name="client"
                            placeholder="Acme Ltd"
                        />
                        <InputError :message="errors.client" />
                    </div>
                    <div class="grid gap-2">
                        <Label for="project-number">Number (optional)</Label>
                        <Input
                            id="project-number"
                            name="project_number"
                            placeholder="P-1024"
                        />
                        <InputError :message="errors.project_number" />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit" :disabled="processing">
                        Create project
                    </Button>
                </DialogFooter>
            </Form>
        </DialogContent>
    </Dialog>

    <!-- Building create / edit dialog -->
    <Dialog
        :open="!!buildingDialog"
        @update:open="(o) => !o && (buildingDialog = null)"
    >
        <DialogContent class="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>
                    {{
                        buildingDialog?.mode === 'edit'
                            ? 'Edit building'
                            : 'New building'
                    }}
                </DialogTitle>
                <DialogDescription>
                    {{
                        buildingDialog?.mode === 'edit'
                            ? 'Update the building details. Reposition it precisely in the scene.'
                            : `Add a building to ${buildingDialog?.project.name ?? ''}.`
                    }}
                </DialogDescription>
            </DialogHeader>

            <Form
                v-if="buildingDialog"
                v-bind="
                    buildingDialog.mode === 'edit'
                        ? BuildingController.update.form.patch({
                              current_team: teamSlug,
                              project: buildingDialog.project.slug,
                              building: buildingDialog.building!.slug,
                          })
                        : BuildingController.store.form({
                              current_team: teamSlug,
                              project: buildingDialog.project.slug,
                          })
                "
                v-slot="{ errors, processing }"
                class="flex flex-col gap-4"
            >
                <div class="grid gap-2">
                    <Label for="name">Name</Label>
                    <Input
                        id="name"
                        name="name"
                        :default-value="
                            buildingDialog.mode === 'edit'
                                ? buildingDialog.building!.name
                                : ''
                        "
                    />
                    <InputError :message="errors.name" />
                </div>
                <div class="grid gap-2">
                    <Label for="address_label">Address (optional)</Label>
                    <Input
                        id="address_label"
                        name="address_label"
                        :default-value="
                            buildingDialog.mode === 'edit'
                                ? (buildingDialog.building!.addressLabel ?? '')
                                : ''
                        "
                    />
                    <InputError :message="errors.address_label" />
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div class="grid gap-2">
                        <Label for="latitude">Latitude (optional)</Label>
                        <Input
                            id="latitude"
                            name="latitude"
                            type="number"
                            step="any"
                            :default-value="
                                buildingDialog.mode === 'edit' &&
                                buildingDialog.building!.origin
                                    ? String(buildingDialog.building!.origin[1])
                                    : ''
                            "
                        />
                        <InputError :message="errors.latitude" />
                    </div>
                    <div class="grid gap-2">
                        <Label for="longitude">Longitude (optional)</Label>
                        <Input
                            id="longitude"
                            name="longitude"
                            type="number"
                            step="any"
                            :default-value="
                                buildingDialog.mode === 'edit' &&
                                buildingDialog.building!.origin
                                    ? String(buildingDialog.building!.origin[0])
                                    : ''
                            "
                        />
                        <InputError :message="errors.longitude" />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit" :disabled="processing">
                        {{
                            buildingDialog.mode === 'edit'
                                ? 'Save changes'
                                : 'Create building'
                        }}
                    </Button>
                </DialogFooter>
            </Form>
        </DialogContent>
    </Dialog>

    <!-- Scheme create / rename dialog -->
    <Dialog
        :open="!!schemeDialog"
        @update:open="(o) => !o && (schemeDialog = null)"
    >
        <DialogContent class="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>
                    {{
                        schemeDialog?.mode === 'edit'
                            ? 'Rename scheme'
                            : 'New scheme'
                    }}
                </DialogTitle>
                <DialogDescription>
                    {{
                        schemeDialog?.mode === 'edit'
                            ? 'Give this scheme a clearer name.'
                            : `Create a draft scheme on ${schemeDialog?.building.name ?? ''}.`
                    }}
                </DialogDescription>
            </DialogHeader>

            <Form
                v-if="schemeDialog"
                v-bind="
                    schemeDialog.mode === 'edit'
                        ? SchemeController.update.form.patch({
                              current_team: teamSlug,
                              project: schemeDialog.project.slug,
                              building: schemeDialog.building.slug,
                              scheme: schemeDialog.scheme!.id,
                          })
                        : SchemeController.store.form({
                              current_team: teamSlug,
                              project: schemeDialog.project.slug,
                              building: schemeDialog.building.slug,
                          })
                "
                v-slot="{ errors, processing }"
                class="flex flex-col gap-4"
            >
                <div class="grid gap-2">
                    <Label for="scheme-name">Name (optional)</Label>
                    <Input
                        id="scheme-name"
                        name="name"
                        :default-value="
                            schemeDialog.mode === 'edit'
                                ? (schemeDialog.scheme!.name ?? '')
                                : ''
                        "
                    />
                    <InputError :message="errors.name" />
                </div>
                <DialogFooter>
                    <Button type="submit" :disabled="processing">
                        {{
                            schemeDialog.mode === 'edit'
                                ? 'Save name'
                                : 'Create scheme'
                        }}
                    </Button>
                </DialogFooter>
            </Form>
        </DialogContent>
    </Dialog>
</template>
