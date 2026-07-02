<script setup lang="ts">
import { Head, Link, usePage } from '@inertiajs/vue3';
import {
    ArrowRight,
    Box,
    FileOutput,
    FolderKanban,
    Leaf,
    MapPin,
    Ruler,
} from '@lucide/vue';
import { computed } from 'vue';
import { login, register, scene } from '@/routes';
import { dashboard } from '@/routes';

const page = usePage();

const sceneUrl = computed(() =>
    page.props.currentTeam ? scene(page.props.currentTeam.slug).url : '/',
);

const dashboardUrl = computed(() =>
    page.props.currentTeam ? dashboard(page.props.currentTeam.slug).url : '/',
);

const features = [
    {
        icon: Ruler,
        title: 'Configure portal frames',
        description:
            'Set span, eaves height, and structural options, then resolve steel sections automatically.',
    },
    {
        icon: MapPin,
        title: 'Place buildings on site',
        description:
            'Search UK addresses and preview your frame in context with nearby surroundings.',
    },
    {
        icon: Box,
        title: 'Explore in 3D',
        description:
            'Inspect geometry, force diagrams, and structural behaviour in an interactive scene.',
    },
    {
        icon: FolderKanban,
        title: 'Save projects & schemes',
        description:
            'Organise buildings into projects and save design schemes you can revisit, compare, and refine.',
    },
    {
        icon: Leaf,
        title: 'Estimate embodied carbon',
        description:
            'Calculate carbon quantities across the frame and export reports for your project.',
    },
    {
        icon: FileOutput,
        title: 'Export deliverables',
        description:
            'Generate carbon reports and IFC models ready to share with your team.',
    },
];
</script>

<template>
    <Head title="Portal frame design and carbon" />

    <div class="welcome-ridge min-h-svh bg-white text-ridge-green antialiased">
        <header class="sticky top-0 z-50 px-5 py-4 md:px-8">
            <div
                class="mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-full bg-white px-5 py-3 shadow-[0_5px_15px_5px_rgba(0,0,0,0.05)] md:px-6"
            >
                <a
                    href="https://ridge.co.uk/"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="shrink-0"
                >
                    <img
                        src="/R_260527_N15_webview.jpg"
                        alt="Ridge"
                        class="h-7 w-auto object-contain md:h-8"
                    />
                </a>

                <nav class="flex items-center gap-2 md:gap-3">
                    <template v-if="$page.props.auth.user">
                        <Link
                            :href="dashboardUrl"
                            class="ridge-btn ridge-btn--ghost ridge-btn--sm"
                        >
                            Dashboard
                        </Link>
                        <Link
                            :href="sceneUrl"
                            class="ridge-btn ridge-btn--fuchsia ridge-btn--sm"
                        >
                            Open 3D scene
                        </Link>
                    </template>
                    <template v-else>
                        <Link
                            :href="login()"
                            class="ridge-btn ridge-btn--ghost ridge-btn--sm"
                        >
                            Log in
                        </Link>
                        <Link
                            :href="register()"
                            class="ridge-btn ridge-btn--fuchsia ridge-btn--sm"
                        >
                            Get started
                        </Link>
                    </template>
                </nav>
            </div>
        </header>

        <main>
            <section class="px-5 pt-10 pb-16 md:px-8 md:pt-16 md:pb-24">
                <div class="mx-auto flex max-w-6xl flex-col gap-10 md:gap-14">
                    <div class="flex max-w-3xl flex-col gap-6 md:gap-8">
                        <p
                            class="text-sm font-medium tracking-[0.12em] text-ridge-fuchsia uppercase"
                        >
                            Stage 2 portal frame tool
                        </p>

                        <h1
                            class="ridge-display text-4xl leading-[1.05] tracking-tight text-balance md:text-5xl lg:text-[3.25rem]"
                        >
                            Design portal frames and quantify
                            <em class="text-ridge-fuchsia not-italic"
                                >carbon</em
                            >
                            in one workflow
                        </h1>

                        <p
                            class="max-w-2xl text-lg leading-[1.3] font-light text-ridge-green/80"
                        >
                            Configure steel portal frames, place them on real UK
                            sites, analyse structure in 3D, and produce carbon
                            outputs — then save your work into projects and
                            iterate across design schemes.
                        </p>

                        <div class="flex flex-wrap items-center gap-3">
                            <template v-if="$page.props.auth.user">
                                <Link
                                    :href="sceneUrl"
                                    class="ridge-btn ridge-btn--fuchsia ridge-btn--lg"
                                >
                                    Open 3D scene
                                    <ArrowRight class="size-4" />
                                </Link>
                                <Link
                                    :href="dashboardUrl"
                                    class="ridge-btn ridge-btn--light ridge-btn--lg"
                                >
                                    Open dashboard
                                </Link>
                            </template>
                            <template v-else>
                                <Link
                                    :href="register()"
                                    class="ridge-btn ridge-btn--fuchsia ridge-btn--lg"
                                >
                                    Create free account
                                    <ArrowRight class="size-4" />
                                </Link>
                                <Link
                                    :href="login()"
                                    class="ridge-btn ridge-btn--light ridge-btn--lg"
                                >
                                    Log in
                                </Link>
                            </template>
                        </div>
                    </div>

                    <div class="relative">
                        <div
                            class="absolute -inset-3 rounded-[1.25rem] bg-linear-to-br from-[#003723]/15 via-[#c6128f]/10 to-[#003723]/5 md:-inset-4 md:rounded-[1.5rem]"
                            aria-hidden="true"
                        />

                        <figure
                            class="bg-ridge-grey relative overflow-hidden rounded-xl border border-ridge-green/10 shadow-[0_24px_80px_rgba(0,55,35,0.18)] md:rounded-2xl"
                        >
                            <img
                                src="/chrome_VYzu6urFdG.png"
                                alt="Portal frame tool showing a 3D steel frame model with embodied carbon analysis and frame property controls"
                                class="block h-auto w-full"
                                loading="eager"
                            />
                        </figure>

                        <div
                            class="absolute bottom-4 left-4 hidden gap-2 sm:flex md:bottom-6 md:left-6"
                        >
                            <span
                                class="rounded-full bg-ridge-green px-3 py-1.5 text-xs font-medium text-white shadow-lg"
                            >
                                166 tCO2e embodied carbon
                            </span>
                            <span
                                class="rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-ridge-green shadow-lg backdrop-blur-sm"
                            >
                                24 m span · 960 m²
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            <section class="bg-ridge-grey px-5 py-16 md:px-8 md:py-20">
                <div class="mx-auto max-w-6xl">
                    <div class="mb-10 max-w-2xl md:mb-14">
                        <h2
                            class="ridge-display text-3xl leading-[1.1] tracking-tight md:text-4xl"
                        >
                            Everything you need for early-stage frame design
                        </h2>
                        <p
                            class="mt-4 text-lg leading-[1.3] font-light text-ridge-green/75"
                        >
                            From geometry and section sizing to carbon
                            reporting, the workflow stays in one place.
                        </p>
                    </div>

                    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <article
                            v-for="feature in features"
                            :key="feature.title"
                            class="group rounded-2xl bg-white p-6 transition-shadow hover:shadow-[0_8px_30px_rgba(0,55,35,0.08)]"
                        >
                            <div
                                class="mb-5 flex size-11 items-center justify-center rounded-full bg-ridge-green/8 text-ridge-green transition-colors group-hover:bg-ridge-fuchsia group-hover:text-white"
                            >
                                <component :is="feature.icon" class="size-5" />
                            </div>
                            <h3 class="ridge-display text-lg leading-[1.2]">
                                {{ feature.title }}
                            </h3>
                            <p
                                class="mt-3 text-sm leading-[1.4] font-light text-ridge-green/70"
                            >
                                {{ feature.description }}
                            </p>
                        </article>
                    </div>
                </div>
            </section>

            <section
                class="bg-ridge-green px-5 py-16 text-white md:px-8 md:py-20"
            >
                <div
                    class="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 md:flex-row md:items-center"
                >
                    <div class="max-w-xl">
                        <h2
                            class="ridge-display text-3xl leading-[1.1] tracking-tight md:text-4xl"
                        >
                            Ready to model your next portal frame?
                        </h2>
                        <p
                            class="mt-4 text-lg leading-[1.3] font-light text-white/75"
                        >
                            Sign in to continue a project or create an account
                            to start from a blank frame.
                        </p>
                    </div>

                    <div class="flex flex-wrap gap-3">
                        <Link
                            v-if="$page.props.auth.user"
                            :href="sceneUrl"
                            class="ridge-btn ridge-btn--fuchsia ridge-btn--lg"
                        >
                            Open 3D scene
                            <ArrowRight class="size-4" />
                        </Link>
                        <template v-else>
                            <Link
                                :href="register()"
                                class="ridge-btn ridge-btn--fuchsia ridge-btn--lg"
                            >
                                Get started
                                <ArrowRight class="size-4" />
                            </Link>
                            <Link
                                :href="login()"
                                class="ridge-btn ridge-btn--white ridge-btn--lg"
                            >
                                Log in
                            </Link>
                        </template>
                    </div>
                </div>
            </section>
        </main>

        <footer class="border-t border-white/10 bg-ridge-green text-white">
            <div
                class="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 md:flex-row md:items-center md:justify-between md:px-8"
            >
                <div
                    class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6"
                >
                    <img
                        src="/R_260527_N15_webview.jpg"
                        alt="Ridge"
                        class="h-6 w-auto brightness-0 invert"
                    />
                    <span class="text-sm font-light text-white/60">
                        Portal frame design and carbon
                    </span>
                </div>

                <div
                    class="flex flex-col gap-2 text-sm font-light text-white/60 sm:flex-row sm:items-center sm:gap-6"
                >
                    <span>Established 1946</span>
                    <a
                        href="https://ridge.co.uk/"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="ridge-footer-link"
                    >
                        ridge.co.uk
                    </a>
                </div>
            </div>
        </footer>
    </div>
</template>

<style scoped>
@import url('https://fonts.bunny.net/css?family=dm-sans:300,400,500,600');

.welcome-ridge {
    --ridge-green: #003723;
    --ridge-fuchsia: #c6128f;
    --ridge-grey: #e4e4e4;
    --ridge-sky: #0fefef;

    font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif;
}

.text-ridge-green {
    color: var(--ridge-green);
}

.text-ridge-fuchsia {
    color: var(--ridge-fuchsia);
}

.bg-ridge-green {
    background-color: var(--ridge-green);
}

.bg-ridge-grey {
    background-color: var(--ridge-grey);
}

.bg-ridge-green\/8 {
    background-color: rgb(0 55 35 / 8%);
}

.ridge-display,
.ridge-stat {
    font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif;
    font-feature-settings:
        'liga' 0,
        'clig' 0;
    font-weight: 500;
}

.ridge-stat {
    font-weight: 500;
    letter-spacing: -0.02em;
}

.ridge-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    border-radius: 9999px;
    font-size: 0.9375rem;
    font-weight: 400;
    line-height: 1.25;
    white-space: nowrap;
    transition:
        transform 0.2s ease,
        filter 0.2s ease,
        background-color 0.2s ease;
}

.ridge-btn:hover {
    transform: scale(0.98);
}

.ridge-btn--sm {
    padding: 0.5rem 0.875rem;
    font-size: 0.875rem;
}

.ridge-btn--lg {
    padding: 0.875rem 1.25rem;
}

.ridge-btn--fuchsia {
    background-color: var(--ridge-fuchsia);
    color: #fff;
}

.ridge-btn--fuchsia:hover {
    filter: brightness(0.92);
}

.ridge-btn--light {
    background-color: var(--ridge-grey);
    color: var(--ridge-green);
}

.ridge-btn--light:hover {
    filter: brightness(0.95);
}

.ridge-btn--white {
    background-color: #fff;
    color: var(--ridge-green);
}

.ridge-btn--white:hover {
    filter: brightness(0.95);
}

.ridge-btn--ghost {
    color: var(--ridge-green);
    background-color: transparent;
}

.ridge-btn--ghost:hover {
    background-color: rgb(0 55 35 / 6%);
    transform: none;
}

.ridge-footer-link {
    position: relative;
    color: #fff;
    text-decoration: none;
    transition: opacity 0.2s ease;
}

.ridge-footer-link::after {
    content: '';
    position: absolute;
    left: 0;
    bottom: -2px;
    width: 100%;
    height: 1px;
    transform: scaleX(0);
    transform-origin: right;
    background-color: var(--ridge-sky);
    transition: transform 0.3s ease;
}

.ridge-footer-link:hover::after {
    transform: scaleX(1);
    transform-origin: left;
}
</style>
