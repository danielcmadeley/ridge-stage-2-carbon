<script setup lang="ts">
import { Form, Head, Link, router, usePage } from '@inertiajs/vue3';
import {
    BadgeCheck,
    Building2,
    ChevronDown,
    FolderKanban,
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
import InputError from '@/components/shared/InputError.vue';
import PendingInvitationsModal from '@/components/teams/PendingInvitationsModal.vue';
import TeamSwitcher from '@/components/teams/TeamSwitcher.vue';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { scene } from '@/routes';
import { edit as editProfile } from '@/routes/profile';
import { edit as editTeam, switchMethod } from '@/routes/teams';
import type { DashboardInvitation, Team, User } from '@/types';
import type { ServerProject } from '@/types/scene';

const props = withDefaults(
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

const stats = computed(() => {
    const buildings = props.projects.flatMap(
        (project) => project.buildings ?? [],
    );
    const schemes = buildings.flatMap((building) => building.schemes);

    return [
        {
            icon: FolderKanban,
            label: 'Projects',
            value: props.projects.length,
        },
        { icon: Building2, label: 'Buildings', value: buildings.length },
        { icon: Layers, label: 'Schemes', value: schemes.length },
        {
            icon: BadgeCheck,
            label: 'Verified schemes',
            value: schemes.filter((scheme) => scheme.status === 'verified')
                .length,
        },
    ];
});

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

    <div
        class="dashboard-ridge flex-1 bg-white text-ridge-green antialiased dark:bg-background dark:text-foreground"
    >
        <div
            class="mx-auto flex w-full max-w-6xl flex-col gap-10 px-5 py-8 md:gap-12 md:px-8 md:py-12"
        >
            <!-- Page header -->
            <div class="flex flex-wrap items-end justify-between gap-6">
                <div class="flex max-w-2xl flex-col gap-3">
                    <p
                        class="text-xs font-medium tracking-[0.12em] text-ridge-fuchsia uppercase"
                    >
                        Dashboard
                    </p>
                    <h1
                        class="ridge-display text-3xl leading-[1.05] tracking-tight md:text-4xl"
                    >
                        {{ currentTeam?.name ?? 'Your team' }}
                    </h1>
                    <p
                        class="text-base leading-[1.3] font-light text-ridge-green/70 dark:text-muted-foreground"
                    >
                        Projects, buildings and design schemes — compare options
                        by embodied carbon and pick a scheme to verify.
                    </p>
                </div>
                <div class="flex items-center gap-2">
                    <TeamSwitcher in-header />
                    <Button
                        class="rounded-full bg-ridge-fuchsia px-5 text-white hover:bg-ridge-fuchsia/90"
                        @click="projectDialogOpen = true"
                    >
                        <Plus class="size-4" />
                        New project
                    </Button>
                </div>
            </div>

            <!-- Stats -->
            <div class="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
                <div
                    v-for="stat in stats"
                    :key="stat.label"
                    class="flex items-center gap-4 rounded-2xl border border-ridge-green/10 bg-white p-4 shadow-[0_8px_30px_rgba(0,55,35,0.05)] md:p-5 dark:border-border dark:bg-card dark:shadow-none"
                >
                    <div
                        class="flex size-10 shrink-0 items-center justify-center rounded-full bg-ridge-green/8 text-ridge-green dark:bg-muted dark:text-foreground"
                    >
                        <component :is="stat.icon" class="size-5" />
                    </div>
                    <div class="min-w-0">
                        <p
                            class="ridge-display text-2xl leading-none tracking-tight"
                        >
                            {{ stat.value }}
                        </p>
                        <p
                            class="mt-1 truncate text-xs font-light text-ridge-green/60 dark:text-muted-foreground"
                        >
                            {{ stat.label }}
                        </p>
                    </div>
                </div>
            </div>

            <!-- Projects -->
            <section class="flex flex-col gap-5">
                <div class="max-w-2xl">
                    <h2
                        class="ridge-display text-xl leading-[1.1] tracking-tight md:text-2xl"
                    >
                        Projects
                    </h2>
                    <p
                        class="mt-1.5 text-sm leading-[1.4] font-light text-ridge-green/70 dark:text-muted-foreground"
                    >
                        Each project groups the buildings and design schemes
                        you've saved from the scene.
                    </p>
                </div>

                <div
                    v-if="projects.length === 0"
                    class="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-ridge-green/20 bg-ridge-grey/25 px-6 py-14 text-center dark:border-border dark:bg-muted/30"
                >
                    <div
                        class="flex size-12 items-center justify-center rounded-full bg-ridge-green/8 text-ridge-green dark:bg-muted dark:text-foreground"
                    >
                        <Building2 class="size-6" />
                    </div>
                    <p
                        class="max-w-sm text-sm leading-[1.4] font-light text-ridge-green/70 dark:text-muted-foreground"
                    >
                        No projects yet. Create your first project to start
                        adding buildings and comparing schemes.
                    </p>
                    <Button
                        class="rounded-full bg-ridge-fuchsia px-5 text-white hover:bg-ridge-fuchsia/90"
                        @click="projectDialogOpen = true"
                    >
                        <Plus class="size-4" />
                        Create project
                    </Button>
                </div>

                <div v-else class="flex flex-col gap-4">
                    <article
                        v-for="project in projects"
                        :key="project.slug"
                        class="rounded-2xl border border-ridge-green/10 bg-white shadow-[0_8px_30px_rgba(0,55,35,0.05)] dark:border-border dark:bg-card dark:shadow-none"
                    >
                        <Collapsible
                            :open="openProjects[project.slug] ?? true"
                            @update:open="toggleProject(project.slug)"
                        >
                            <div
                                class="flex items-center justify-between gap-4 p-5 md:px-6"
                            >
                                <div class="min-w-0">
                                    <CollapsibleTrigger as-child>
                                        <button
                                            type="button"
                                            class="flex items-center gap-2 text-left"
                                            :aria-expanded="
                                                openProjects[project.slug] ??
                                                true
                                            "
                                        >
                                            <ChevronDown
                                                class="size-4 shrink-0 text-ridge-green/50 transition-transform dark:text-muted-foreground"
                                                :class="
                                                    (openProjects[
                                                        project.slug
                                                    ] ?? true)
                                                        ? ''
                                                        : '-rotate-90'
                                                "
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
                                        <span v-if="project.client">{{
                                            project.client
                                        }}</span>
                                        <span
                                            v-if="
                                                project.client &&
                                                project.projectNumber
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
                                            {{
                                                (project.buildings ?? []).length
                                            }}
                                            building(s)
                                        </span>
                                    </p>
                                </div>
                                <div class="flex shrink-0 items-center gap-1">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        class="rounded-full border-ridge-green/20 text-ridge-green hover:bg-ridge-green/5 hover:text-ridge-green dark:border-border dark:text-foreground dark:hover:bg-accent dark:hover:text-foreground"
                                        @click="
                                            buildingDialog = {
                                                mode: 'create',
                                                project,
                                            }
                                        "
                                    >
                                        <Plus class="size-4" /> Building
                                    </Button>
                                    <Form
                                        v-bind="
                                            ProjectController.destroy.form.delete(
                                                {
                                                    current_team: teamSlug,
                                                    project: project.slug,
                                                },
                                            )
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
                                <div
                                    class="flex flex-col gap-3 px-5 pb-5 md:px-6 md:pb-6"
                                >
                                    <div
                                        v-if="
                                            (project.buildings ?? []).length ===
                                            0
                                        "
                                        class="rounded-xl border border-dashed border-ridge-green/20 bg-ridge-grey/25 p-6 text-center text-sm font-light text-ridge-green/60 dark:border-border dark:bg-muted/30 dark:text-muted-foreground"
                                    >
                                        No buildings yet. Add one to start
                                        designing schemes.
                                    </div>

                                    <Collapsible
                                        v-for="building in project.buildings ??
                                        []"
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
                                        <div
                                            class="rounded-xl bg-ridge-grey/35 dark:bg-muted/40"
                                        >
                                            <div
                                                class="flex items-center justify-between gap-2 p-3 md:px-4"
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
                                                            class="size-4 shrink-0 text-ridge-green/50 transition-transform dark:text-muted-foreground"
                                                            :class="
                                                                (openBuildings[
                                                                    `${project.slug}/${building.slug}`
                                                                ] ?? false)
                                                                    ? ''
                                                                    : '-rotate-90'
                                                            "
                                                        />
                                                        <Building2
                                                            class="size-4 shrink-0 text-ridge-green/50 dark:text-muted-foreground"
                                                        />
                                                        <span
                                                            class="truncate text-sm font-medium"
                                                            >{{
                                                                building.name
                                                            }}</span
                                                        >
                                                        <Badge
                                                            variant="outline"
                                                            class="shrink-0 rounded-full border-ridge-green/20 font-light text-ridge-green/70 dark:border-border dark:text-muted-foreground"
                                                        >
                                                            {{
                                                                building.schemes
                                                                    .length
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
                                                        size="sm"
                                                        class="rounded-full bg-ridge-green text-white hover:bg-ridge-green/90"
                                                    >
                                                        <Link
                                                            :href="
                                                                sceneHref(
                                                                    building.slug,
                                                                )
                                                            "
                                                        >
                                                            <MapPin
                                                                class="size-4"
                                                            />
                                                            Open in scene
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        class="size-8 rounded-full hover:bg-ridge-green/10"
                                                        aria-label="Edit building"
                                                        @click="
                                                            buildingDialog = {
                                                                mode: 'edit',
                                                                project,
                                                                building,
                                                            }
                                                        "
                                                    >
                                                        <Pencil
                                                            class="size-4"
                                                        />
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
                                                            class="size-8 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                            aria-label="Delete building"
                                                        >
                                                            <Trash2
                                                                class="size-4"
                                                            />
                                                        </Button>
                                                    </Form>
                                                </div>
                                            </div>

                                            <CollapsibleContent>
                                                <div
                                                    class="flex flex-col gap-2 p-3 pt-0 md:px-4 md:pb-4"
                                                >
                                                    <div
                                                        v-if="
                                                            building.schemes
                                                                .length === 0
                                                        "
                                                        class="text-sm font-light text-ridge-green/60 dark:text-muted-foreground"
                                                    >
                                                        No schemes yet.
                                                    </div>

                                                    <div
                                                        v-for="scheme in building.schemes"
                                                        :key="scheme.id"
                                                        class="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 dark:bg-card"
                                                        :class="
                                                            scheme.status ===
                                                            'verified'
                                                                ? 'ring-1 ring-ridge-green/40'
                                                                : 'ring-1 ring-ridge-green/10 dark:ring-border'
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
                                                                class="size-4 shrink-0 text-ridge-green dark:text-emerald-400"
                                                            />
                                                            <Layers
                                                                v-else
                                                                class="size-4 shrink-0 text-ridge-green/50 dark:text-muted-foreground"
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
                                                                class="shrink-0 rounded-full border-transparent bg-ridge-green text-white capitalize"
                                                            >
                                                                Verified
                                                            </Badge>
                                                            <Badge
                                                                v-else
                                                                variant="secondary"
                                                                class="shrink-0 rounded-full font-light capitalize"
                                                            >
                                                                {{
                                                                    scheme.status
                                                                }}
                                                            </Badge>
                                                            <Badge
                                                                v-if="
                                                                    scheme.id ===
                                                                    lowestCarbonSchemeId(
                                                                        building,
                                                                    )
                                                                "
                                                                variant="outline"
                                                                class="shrink-0 gap-1 rounded-full border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400"
                                                            >
                                                                <Leaf
                                                                    class="size-3"
                                                                />
                                                                Lowest carbon
                                                            </Badge>
                                                            <span
                                                                v-if="
                                                                    scheme
                                                                        .carbon
                                                                        .carbonIntensityKgM2 !=
                                                                    null
                                                                "
                                                                class="shrink-0 text-xs font-light text-ridge-green/60 dark:text-muted-foreground"
                                                            >
                                                                {{
                                                                    Math.round(
                                                                        scheme
                                                                            .carbon
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
                                                                class="rounded-full border-ridge-green/20 text-ridge-green hover:bg-ridge-green/5 hover:text-ridge-green dark:border-border dark:text-foreground dark:hover:bg-accent dark:hover:text-foreground"
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
                                                                class="rounded-full hover:bg-ridge-green/10"
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
                                                                class="size-8 rounded-full hover:bg-ridge-green/10"
                                                                aria-label="Rename scheme"
                                                                @click="
                                                                    schemeDialog =
                                                                        {
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
                                                                    class="size-8 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
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
                                                        variant="ghost"
                                                        size="sm"
                                                        class="w-fit rounded-full text-ridge-green/70 hover:bg-ridge-green/10 hover:text-ridge-green dark:text-muted-foreground dark:hover:text-foreground"
                                                        @click="
                                                            schemeDialog = {
                                                                mode: 'create',
                                                                project,
                                                                building,
                                                            }
                                                        "
                                                    >
                                                        <Plus class="size-4" />
                                                        Add scheme
                                                    </Button>
                                                </div>
                                            </CollapsibleContent>
                                        </div>
                                    </Collapsible>
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    </article>
                </div>
            </section>

            <!-- Workspace -->
            <section
                class="rounded-3xl bg-ridge-grey/45 p-5 md:p-8 dark:bg-muted/30"
            >
                <div class="mb-5 max-w-2xl md:mb-6">
                    <h2
                        class="ridge-display text-xl leading-[1.1] tracking-tight md:text-2xl"
                    >
                        Workspace
                    </h2>
                    <p
                        class="mt-1.5 text-sm leading-[1.4] font-light text-ridge-green/70 dark:text-muted-foreground"
                    >
                        Your account, the team you're working in, and the teams
                        you belong to.
                    </p>
                </div>

                <div class="grid gap-4 md:grid-cols-3">
                    <div
                        class="flex flex-col gap-4 rounded-2xl bg-white p-6 dark:bg-card"
                    >
                        <div
                            class="flex size-10 items-center justify-center rounded-full bg-ridge-green/8 text-ridge-green dark:bg-muted dark:text-foreground"
                        >
                            <Settings class="size-5" />
                        </div>
                        <div class="flex items-center gap-3">
                            <Avatar v-if="user" class="size-10">
                                <AvatarFallback>{{
                                    initials(user.name)
                                }}</AvatarFallback>
                            </Avatar>
                            <div v-if="user" class="min-w-0 flex-1">
                                <p class="truncate text-sm font-medium">
                                    {{ user.name }}
                                </p>
                                <p
                                    class="truncate text-xs font-light text-ridge-green/60 dark:text-muted-foreground"
                                >
                                    {{ user.email }}
                                </p>
                            </div>
                        </div>
                        <Button
                            as-child
                            variant="outline"
                            size="sm"
                            class="mt-auto w-full rounded-full border-ridge-green/20 text-ridge-green hover:bg-ridge-green/5 hover:text-ridge-green dark:border-border dark:text-foreground dark:hover:bg-accent dark:hover:text-foreground"
                        >
                            <Link :href="editProfile()" prefetch>
                                <Settings class="size-4" /> Your settings
                            </Link>
                        </Button>
                    </div>

                    <div
                        class="flex flex-col gap-4 rounded-2xl bg-white p-6 dark:bg-card"
                    >
                        <div
                            class="flex size-10 items-center justify-center rounded-full bg-ridge-green/8 text-ridge-green dark:bg-muted dark:text-foreground"
                        >
                            <Users class="size-5" />
                        </div>
                        <div class="flex items-center justify-between gap-2">
                            <div class="min-w-0">
                                <p class="truncate text-sm font-medium">
                                    {{ currentTeam?.name ?? '—' }}
                                </p>
                                <p
                                    v-if="currentTeam?.roleLabel"
                                    class="text-xs font-light text-ridge-green/60 dark:text-muted-foreground"
                                >
                                    {{ currentTeam.roleLabel }}
                                </p>
                            </div>
                            <Badge
                                v-if="currentTeam?.isPersonal"
                                variant="secondary"
                                class="rounded-full font-light"
                                >Personal</Badge
                            >
                        </div>
                        <Button
                            as-child
                            variant="outline"
                            size="sm"
                            class="mt-auto w-full rounded-full border-ridge-green/20 text-ridge-green hover:bg-ridge-green/5 hover:text-ridge-green dark:border-border dark:text-foreground dark:hover:bg-accent dark:hover:text-foreground"
                        >
                            <Link
                                :href="
                                    editTeam({ team: currentTeam?.slug ?? '' })
                                "
                            >
                                <Users class="size-4" /> Manage team
                            </Link>
                        </Button>
                    </div>

                    <div
                        class="flex flex-col gap-2 rounded-2xl bg-white p-6 dark:bg-card"
                    >
                        <div
                            class="mb-2 flex size-10 items-center justify-center rounded-full bg-ridge-green/8 text-ridge-green dark:bg-muted dark:text-foreground"
                        >
                            <Users class="size-5" />
                        </div>
                        <div
                            v-for="team in teams"
                            :key="team.id"
                            class="flex items-center justify-between gap-2 rounded-xl px-3 py-2"
                            :class="
                                team.isCurrent
                                    ? 'bg-ridge-green/5 dark:bg-accent'
                                    : ''
                            "
                        >
                            <div class="min-w-0">
                                <p class="truncate text-sm font-medium">
                                    {{ team.name }}
                                </p>
                                <p
                                    v-if="team.roleLabel"
                                    class="text-xs font-light text-ridge-green/60 dark:text-muted-foreground"
                                >
                                    {{ team.roleLabel }}
                                </p>
                            </div>
                            <Button
                                v-if="!team.isCurrent"
                                variant="ghost"
                                size="sm"
                                class="rounded-full hover:bg-ridge-green/10"
                                @click="switchTo(team)"
                            >
                                Switch
                            </Button>
                            <Badge
                                v-else
                                variant="secondary"
                                class="rounded-full font-light"
                                >Current</Badge
                            >
                        </div>
                        <p
                            v-if="teams.length === 0"
                            class="text-sm font-light text-ridge-green/60 dark:text-muted-foreground"
                        >
                            No other teams.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    </div>

    <!-- Project create dialog -->
    <Dialog v-model:open="projectDialogOpen">
        <DialogContent class="rounded-2xl sm:max-w-lg">
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
                    <Button
                        type="submit"
                        class="rounded-full bg-ridge-fuchsia px-5 text-white hover:bg-ridge-fuchsia/90"
                        :disabled="processing"
                    >
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
        <DialogContent class="rounded-2xl sm:max-w-md">
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
                    <Button
                        type="submit"
                        class="rounded-full bg-ridge-fuchsia px-5 text-white hover:bg-ridge-fuchsia/90"
                        :disabled="processing"
                    >
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
        <DialogContent class="rounded-2xl sm:max-w-md">
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
                    <Button
                        type="submit"
                        class="rounded-full bg-ridge-fuchsia px-5 text-white hover:bg-ridge-fuchsia/90"
                        :disabled="processing"
                    >
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

<style scoped>
@import url('https://fonts.bunny.net/css?family=dm-sans:300,400,500,600');

.dashboard-ridge {
    font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif;
}

.ridge-display {
    font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif;
    font-feature-settings:
        'liga' 0,
        'clig' 0;
    font-weight: 500;
}
</style>
