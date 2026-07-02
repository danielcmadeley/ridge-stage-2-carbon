<script setup lang="ts">
import { Form, Head, Link, router, usePage } from '@inertiajs/vue3';
import {
    BadgeCheck,
    Building2,
    FolderKanban,
    Layers,
    Plus,
    Settings,
    Users,
} from '@lucide/vue';
import { computed, ref } from 'vue';
import BuildingController from '@/actions/App/Http/Controllers/BuildingController';
import ProjectController from '@/actions/App/Http/Controllers/ProjectController';
import SchemeController from '@/actions/App/Http/Controllers/SchemeController';
import ProjectCard from '@/components/dashboard/ProjectCard.vue';
import InputError from '@/components/shared/InputError.vue';
import PendingInvitationsModal from '@/components/teams/PendingInvitationsModal.vue';
import TeamSwitcher from '@/components/teams/TeamSwitcher.vue';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
import { edit as editProfile } from '@/routes/profile';
import { edit as editTeam, switchMethod } from '@/routes/teams';
import type { DashboardInvitation, Team, User } from '@/types';
import type { ServerBuilding, ServerProject } from '@/types/scene';

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

// Building edit/create dialog state.
const buildingDialog = ref<{
    mode: 'create' | 'edit';
    project: ServerProject;
    building?: ServerBuilding;
} | null>(null);

// Scheme rename/create dialog state.
const schemeDialog = ref<{
    mode: 'create' | 'edit';
    project: ServerProject;
    building: ServerBuilding;
    scheme?: { id: number; name: string | null };
} | null>(null);

const projectDialogOpen = ref(false);

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
                    <ProjectCard
                        v-for="project in projects"
                        :key="project.slug"
                        :team-slug="teamSlug"
                        :project="project"
                        @create-building="
                            buildingDialog = { mode: 'create', project }
                        "
                        @edit-building="
                            (building) =>
                                (buildingDialog = {
                                    mode: 'edit',
                                    project,
                                    building,
                                })
                        "
                        @create-scheme="
                            (building) =>
                                (schemeDialog = {
                                    mode: 'create',
                                    project,
                                    building,
                                })
                        "
                        @rename-scheme="
                            (building, scheme) =>
                                (schemeDialog = {
                                    mode: 'edit',
                                    project,
                                    building,
                                    scheme,
                                })
                        "
                    />
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

/* :deep() lets the display face reach child components (e.g. ProjectCard). */
.ridge-display,
.dashboard-ridge :deep(.ridge-display) {
    font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif;
    font-feature-settings:
        'liga' 0,
        'clig' 0;
    font-weight: 500;
}
</style>
