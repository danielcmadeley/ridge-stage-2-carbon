<script setup lang="ts">
import { FileText } from '@lucide/vue';
import { computed } from 'vue';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import type { ChartConfig } from '@/components/ui/chart';
import { ChartContainer } from '@/components/ui/chart';
import { chartCategoricalColors } from '@/components/ui/chart/chart-colors';
import { DonutChart } from '@/components/ui/chart-donut';
import { Separator } from '@/components/ui/separator';
import type { PortalFrameCarbon } from '@/lib/portal-frame/carbon/carbon';
import type { ScorsBand } from '@/lib/portal-frame/carbon/scors';
import { buildCarbonReportAnalytics } from '@/lib/report/carbon-report-analytics';

const props = defineProps<{
    carbon: PortalFrameCarbon;
    isCarbonReportPreviewing: boolean;
    carbonReportError: string | null;
    canExportReport: boolean;
}>();

const emit = defineEmits<{
    previewReport: [];
}>();

type ChartDatum = {
    label: string;
    carbon: number;
};

const scorsBandClasses: Record<ScorsBand, string> = {
    A: 'bg-green-600 text-white',
    B: 'bg-green-500 text-white',
    C: 'bg-lime-500 text-white',
    D: 'bg-yellow-500 text-black',
    E: 'bg-orange-500 text-white',
    F: 'bg-red-500 text-white',
    G: 'bg-red-700 text-white',
};

const analytics = computed(() => buildCarbonReportAnalytics(props.carbon));

const materialChartData = computed<ChartDatum[]>(() =>
    analytics.value.categories
        .filter((category) => category.carbonKg > 0)
        .map((category) => ({
            label: category.label,
            carbon: category.carbonKg,
        })),
);

const elementChartData = computed<ChartDatum[]>(() => {
    const ranked = analytics.value.elements
        .filter((element) => element.carbonKg > 0)
        .sort((left, right) => right.carbonKg - left.carbonKg);

    const top = ranked.slice(0, 7).map((element) => ({
        label: element.label,
        carbon: element.carbonKg,
    }));

    const otherCarbon = ranked
        .slice(7)
        .reduce((total, element) => total + element.carbonKg, 0);

    if (otherCarbon > 0) {
        top.push({ label: 'Other', carbon: otherCarbon });
    }

    return top;
});

function buildChartConfig(data: ChartDatum[]): ChartConfig {
    const colors = chartCategoricalColors(data.length);

    return Object.fromEntries(
        data.map((item, index) => [
            item.label,
            {
                label: item.label,
                color: colors[index],
            },
        ]),
    );
}

const materialChartColors = computed(() =>
    chartCategoricalColors(materialChartData.value.length),
);
const elementChartColors = computed(() =>
    chartCategoricalColors(elementChartData.value.length),
);

const materialChartConfig = computed(() =>
    buildChartConfig(materialChartData.value),
);
const elementChartConfig = computed(() =>
    buildChartConfig(elementChartData.value),
);

function formatCarbon(carbonKg: number): string {
    if (carbonKg >= 1000) {
        return `${(carbonKg / 1000).toLocaleString(undefined, {
            maximumFractionDigits: 2,
        })} tCO₂e`;
    }

    return `${carbonKg.toLocaleString(undefined, {
        maximumFractionDigits: 0,
    })} kgCO₂e`;
}

function formatChartCarbon(carbonKg: number): string {
    return formatCarbon(carbonKg);
}

function carbonShare(carbonKg: number): number {
    if (props.carbon.totalCarbonKg <= 0) {
        return 0;
    }

    return (carbonKg / props.carbon.totalCarbonKg) * 100;
}
</script>

<template>
    <Card
        class="flex min-h-0 flex-1 flex-col gap-0 border-0 bg-transparent py-0 shadow-none"
    >
        <CardHeader class="shrink-0 border-b border-sidebar-border/70 py-4">
            <div class="flex items-start justify-between gap-2">
                <div class="min-w-0 flex-1">
                    <CardTitle>Embodied carbon</CardTitle>
                    <CardDescription class="text-xs">
                        A1–A3 estimate from element mass × factor. Includes a
                        250mm slab with H12 top and bottom at 200mm centres,
                        plus 10% steel for connections.
                    </CardDescription>
                </div>
                <div class="flex shrink-0 items-start gap-1">
                    <span
                        class="flex size-9 items-center justify-center rounded-md text-base font-bold"
                        :class="scorsBandClasses[carbon.scorsBand]"
                        :title="`IStructE SCORS band ${carbon.scorsBand}`"
                    >
                        {{ carbon.scorsBand }}
                    </span>
                </div>
            </div>
        </CardHeader>

        <CardContent
            class="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto py-4 text-sm"
        >
            <div class="grid grid-cols-2 gap-3">
                <div
                    class="rounded-md border border-sidebar-border/70 bg-muted/40 px-3 py-2"
                >
                    <p class="text-xs text-muted-foreground">Total</p>
                    <p class="font-semibold">
                        {{ formatCarbon(carbon.totalCarbonKg) }}
                    </p>
                </div>
                <div
                    class="rounded-md border border-sidebar-border/70 bg-muted/40 px-3 py-2"
                >
                    <p class="text-xs text-muted-foreground">Intensity</p>
                    <p class="font-semibold">
                        {{ carbon.carbonIntensityKgM2.toFixed(0) }}
                        kgCO₂e/m²
                    </p>
                    <p class="text-xs text-muted-foreground">
                        over {{ carbon.floorAreaM2.toFixed(0) }} m² GIFA
                    </p>
                </div>
            </div>

            <section class="space-y-3">
                <div>
                    <h3 class="text-sm font-medium">By material</h3>
                    <p class="text-xs text-muted-foreground">
                        Carbon grouped into structural material categories.
                    </p>
                </div>

                <ChartContainer
                    :config="materialChartConfig"
                    class="mx-auto aspect-square max-h-[180px] w-full"
                >
                    <DonutChart
                        type="pie"
                        :data="materialChartData"
                        :colors="materialChartColors"
                        index="label"
                        category="carbon"
                        :value-formatter="formatChartCarbon"
                    />
                </ChartContainer>

                <ul class="space-y-1.5">
                    <li
                        v-for="(item, index) in materialChartData"
                        :key="item.label"
                        class="flex items-center justify-between gap-2 text-xs"
                    >
                        <div class="flex min-w-0 items-center gap-2">
                            <span
                                class="size-2 shrink-0 rounded-full"
                                :style="{
                                    backgroundColor: materialChartColors[index],
                                }"
                            />
                            <span class="truncate">{{ item.label }}</span>
                        </div>
                        <span
                            class="shrink-0 text-muted-foreground tabular-nums"
                        >
                            {{ carbonShare(item.carbon).toFixed(0) }}%
                        </span>
                    </li>
                </ul>
            </section>

            <Separator />

            <section class="space-y-3">
                <div>
                    <h3 class="text-sm font-medium">By element</h3>
                    <p class="text-xs text-muted-foreground">
                        Largest individual contributors to embodied carbon.
                    </p>
                </div>

                <ChartContainer
                    :config="elementChartConfig"
                    class="mx-auto aspect-square max-h-[180px] w-full"
                >
                    <DonutChart
                        type="donut"
                        :data="elementChartData"
                        :colors="elementChartColors"
                        index="label"
                        category="carbon"
                        :value-formatter="formatChartCarbon"
                    />
                </ChartContainer>

                <ul class="space-y-2">
                    <li
                        v-for="(item, index) in elementChartData"
                        :key="item.label"
                        class="grid grid-cols-[1fr_auto] items-center gap-x-3"
                    >
                        <div class="flex min-w-0 items-center gap-2">
                            <span
                                class="size-2 shrink-0 rounded-full"
                                :style="{
                                    backgroundColor: elementChartColors[index],
                                }"
                            />
                            <span class="truncate">{{ item.label }}</span>
                            <span class="text-xs text-muted-foreground">
                                {{ carbonShare(item.carbon).toFixed(0) }}%
                            </span>
                        </div>
                        <span class="text-right tabular-nums">
                            {{ formatCarbon(item.carbon) }}
                        </span>
                    </li>
                </ul>
            </section>

            <div
                class="flex items-center justify-between gap-2 rounded-md border border-sidebar-border/70 bg-muted/30 px-3 py-2 text-xs"
            >
                <span class="text-muted-foreground"
                    >Steel sections subtotal</span
                >
                <span class="font-medium tabular-nums">
                    {{ formatCarbon(carbon.steelSectionsCarbonKg) }}
                </span>
            </div>
        </CardContent>

        <CardFooter
            class="shrink-0 flex-col gap-2 border-t border-sidebar-border/70 py-4"
        >
            <Button
                type="button"
                class="w-full"
                variant="outline"
                :disabled="isCarbonReportPreviewing || !canExportReport"
                @click="emit('previewReport')"
            >
                <FileText class="size-4" />
                {{
                    isCarbonReportPreviewing
                        ? 'Compiling report…'
                        : 'Export report'
                }}
            </Button>

            <p v-if="carbonReportError" class="text-sm text-destructive">
                {{ carbonReportError }}
            </p>
        </CardFooter>
    </Card>
</template>
