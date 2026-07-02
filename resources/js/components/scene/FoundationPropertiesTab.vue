<script setup lang="ts">
import { computed } from 'vue';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type {
    FoundationSizingBySide,
    FoundationSizingEntry,
} from '@/composables/usePortalFrameResults';
import type { FoundationSizingResult } from '@/lib/portal-frame';
import type {
    FoundationAssumptions,
    FoundationDesign,
    FoundationType,
} from '@/types/portal-frame';

const props = defineProps<{
    foundation: FoundationDesign;
    foundationSizing: FoundationSizingBySide | null;
    foundationSizingEntries: FoundationSizingEntry[];
}>();

const emit = defineEmits<{
    updateType: [type: FoundationType];
    updateAssumption: [key: keyof FoundationAssumptions, value: number];
}>();

const foundationTypeLabels: Record<FoundationType, string> = {
    two_pile_cap: 'Two-pile pile cap',
    reinforced_pad: 'Reinforced pad',
    mass_filled: 'Mass-filled',
};

type AssumptionField = {
    id: string;
    label: string;
    key: keyof FoundationAssumptions;
    min: number;
    step: number;
    /** Only shown for this foundation type; visible for all when omitted. */
    onlyFor?: FoundationType;
};

const assumptionFields: AssumptionField[] = [
    {
        id: 'allowable-bearing',
        label: 'Bearing (kPa)',
        key: 'allowableBearingKpa',
        min: 1,
        step: 5,
    },
    {
        id: 'concrete-density',
        label: 'Concrete (kN/m³)',
        key: 'concreteDensityKnM3',
        min: 1,
        step: 0.5,
    },
    {
        id: 'soil-density',
        label: 'Soil unit weight (kN/m³)',
        key: 'soilCoverDensityKnM3',
        min: 1,
        step: 0.5,
    },
    {
        id: 'friction-angle',
        label: "φ' friction (deg)",
        key: 'effectiveFrictionAngleDeg',
        min: 0,
        step: 1,
    },
    {
        id: 'interface-angle',
        label: 'δ interface (deg)',
        key: 'interfaceFrictionAngleDeg',
        min: 0,
        step: 1,
    },
    {
        id: 'retained-soil',
        label: 'Retained soil (m)',
        key: 'retainedSoilDepthM',
        min: 0,
        step: 0.05,
    },
    {
        id: 'soil-modulus',
        label: 'E soil (kN/m²)',
        key: 'soilModulusKnM2',
        min: 1,
        step: 1000,
    },
    {
        id: 'concrete-strength',
        label: 'fck (MPa)',
        key: 'concreteStrengthMpa',
        min: 1,
        step: 2,
    },
    {
        id: 'concrete-cover',
        label: 'Cover (m)',
        key: 'concreteCoverM',
        min: 0.01,
        step: 0.01,
    },
    {
        id: 'bar-diameter',
        label: 'Bar dia. (mm)',
        key: 'preferredBarDiameterMm',
        min: 6,
        step: 2,
        onlyFor: 'reinforced_pad',
    },
    {
        id: 'rebar-yield',
        label: 'Rebar fy (MPa)',
        key: 'reinforcementYieldStrengthMpa',
        min: 1,
        step: 10,
        onlyFor: 'reinforced_pad',
    },
    {
        id: 'rebar-uplift',
        label: 'Rebar uplift',
        key: 'rebarUpliftFactor',
        min: 1,
        step: 0.05,
        onlyFor: 'reinforced_pad',
    },
    {
        id: 'pile-capacity',
        label: 'Pile capacity (kN)',
        key: 'pileWorkingCapacityKn',
        min: 1,
        step: 10,
        onlyFor: 'two_pile_cap',
    },
    {
        id: 'pile-diameter',
        label: 'Pile Ø (m)',
        key: 'pileDiameterM',
        min: 0.1,
        step: 0.05,
        onlyFor: 'two_pile_cap',
    },
    {
        id: 'pile-spacing-factor',
        label: 'Pile spacing factor (× Ø)',
        key: 'pileSpacingFactor',
        min: 2,
        step: 0.25,
        onlyFor: 'two_pile_cap',
    },
    {
        id: 'pile-depth',
        label: 'Pile depth (m)',
        key: 'pileDepthM',
        min: 1,
        step: 0.5,
        onlyFor: 'two_pile_cap',
    },
    {
        id: 'cap-overhang',
        label: 'Cap overhang (mm)',
        key: 'capOverhangMm',
        min: 50,
        step: 25,
        onlyFor: 'two_pile_cap',
    },
    {
        id: 'rebar-rate',
        label: 'Rebar rate (kg/m³)',
        key: 'rebarRateKgM3',
        min: 0,
        step: 10,
        onlyFor: 'two_pile_cap',
    },
];

const visibleAssumptionFields = computed(() =>
    assumptionFields.filter(
        (field) => !field.onlyFor || field.onlyFor === props.foundation.type,
    ),
);

const sizingResultLabel = computed(
    () =>
        props.foundationSizingEntries[0]?.result.label ??
        foundationTypeLabels[props.foundation.type],
);

function updateFoundationType(event: Event): void {
    emit(
        'updateType',
        (event.target as HTMLSelectElement).value as FoundationType,
    );
}

function updateAssumption(
    key: keyof FoundationAssumptions,
    value: string | number,
): void {
    const numeric = typeof value === 'number' ? value : Number(value);

    if (Number.isFinite(numeric)) {
        emit('updateAssumption', key, numeric);
    }
}

function foundationResultStatus(result: FoundationSizingResult): string {
    return result.checks.every((check) => check.passes) ? 'Pass' : 'Review';
}

function maximumUtilisation(result: FoundationSizingResult): number {
    return Math.max(...result.checks.map((check) => check.utilisation));
}

function governingCheck(result: FoundationSizingResult) {
    const checks = result.checks.filter(
        (check) => !check.label.includes('passive-discounted'),
    );

    return checks.reduce((best, check) =>
        check.utilisation > best.utilisation ? check : best,
    );
}

function governingCheckLabel(result: FoundationSizingResult): string {
    const check = governingCheck(result);

    return `${check.label} (${check.utilisation.toFixed(2)})`;
}

const padLikeFoundationTypes = new Set<FoundationType>([
    'reinforced_pad',
    'mass_filled',
]);
</script>

<template>
    <div
        class="flex flex-col gap-4"
        role="tabpanel"
        aria-label="Foundation Properties"
    >
        <div class="grid gap-2">
            <Label for="foundation-type">Foundation type</Label>
            <select
                id="foundation-type"
                class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                :value="foundation.type"
                @change="updateFoundationType"
            >
                <option value="two_pile_cap">Two-pile pile cap</option>
                <option value="reinforced_pad">
                    Pad foundation with reinforcement
                </option>
                <option value="mass_filled">Mass-filled foundation</option>
            </select>
        </div>

        <details
            class="rounded-md border border-sidebar-border/70 bg-muted/40 px-3 py-2 text-sm"
            open
        >
            <summary class="cursor-pointer font-medium">
                Foundation assumptions
            </summary>
            <div class="mt-3 grid grid-cols-2 gap-3">
                <div
                    v-for="field in visibleAssumptionFields"
                    :key="field.id"
                    class="grid gap-2"
                >
                    <Label :for="field.id">{{ field.label }}</Label>
                    <Input
                        :id="field.id"
                        :model-value="foundation.assumptions[field.key]"
                        type="number"
                        :min="field.min"
                        :step="field.step"
                        @update:model-value="
                            updateAssumption(field.key, $event)
                        "
                    />
                </div>
                <div
                    v-if="foundation.type === 'two_pile_cap'"
                    class="col-span-2 rounded-md border border-sidebar-border/70 bg-background/50 p-2 text-xs text-muted-foreground"
                >
                    Cap plan, depth, and pile reactions are sized from the pile
                    geometry and column load; the report shows every
                    strut-and-tie check.
                </div>
            </div>
        </details>

        <div
            v-if="foundationSizing"
            class="rounded-md border border-sidebar-border/70 bg-muted/40 px-3 py-2 text-sm"
        >
            <p class="font-medium">{{ sizingResultLabel }} sizing</p>
            <p class="mt-1 text-xs text-muted-foreground">
                Preliminary sizing from base reactions. Confirm with project
                geotechnical and code checks.
            </p>
            <p
                v-if="padLikeFoundationTypes.has(foundation.type)"
                class="mt-2 text-xs text-muted-foreground"
            >
                Reinforced pad and mass-filled often share the same plan size
                for moderate column loads because geotechnical checks govern
                both. Mass-filled grows when the EC2 plain-footing projection
                rule becomes governing under heavier loads.
            </p>
            <div class="mt-3 grid gap-3">
                <div
                    v-for="{ side, result } in foundationSizingEntries"
                    :key="`${side}-${result.type}`"
                    class="rounded-md border border-sidebar-border/70 bg-background/50 p-2"
                >
                    <div class="flex items-center justify-between gap-2">
                        <p class="font-medium capitalize">{{ side }} base</p>
                        <span
                            :class="
                                result.checks.every((check) => check.passes)
                                    ? 'text-green-600'
                                    : 'text-destructive'
                            "
                        >
                            {{ foundationResultStatus(result) }}
                            ({{ maximumUtilisation(result).toFixed(2) }})
                        </span>
                    </div>
                    <p class="mt-1">
                        {{ result.dimensions.widthM.toFixed(2) }}m ×
                        {{ result.dimensions.depthM.toFixed(2) }}m ×
                        {{ result.dimensions.heightM.toFixed(2) }}m
                    </p>
                    <p class="mt-1 text-xs text-muted-foreground">
                        Governing: {{ governingCheckLabel(result) }}
                    </p>
                    <p v-if="result.reinforcement" class="mt-1">
                        Rebar: T{{
                            result.reinforcement.barDiameterMm.toFixed(0)
                        }}
                        @
                        {{ result.reinforcement.spacingMm.toFixed(0) }}mm each
                        way
                    </p>
                    <p v-if="result.pileCap" class="mt-1">
                        Piles: {{ result.pileCap.pileCount }} ×
                        {{ (result.pileCap.pileDiameterM * 1000).toFixed(0) }}mm
                        Ø × {{ result.pileCap.pileDepthM.toFixed(1) }}m deep,
                        {{ result.pileCap.pileSpacingM.toFixed(2) }}m c/c,
                        {{ result.pileCap.pileCompressionKn.toFixed(1) }}kN max
                    </p>
                    <ul class="mt-2 space-y-1 text-xs">
                        <li
                            v-for="check in result.checks"
                            :key="check.label"
                            class="flex justify-between gap-2"
                        >
                            <span>{{ check.label }}</span>
                            <span>
                                {{ check.demand.toFixed(1) }} /
                                {{ check.capacity.toFixed(1) }}
                                {{ check.unit }}
                            </span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
</template>
