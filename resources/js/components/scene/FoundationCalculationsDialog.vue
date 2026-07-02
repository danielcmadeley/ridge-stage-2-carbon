<script setup lang="ts">
import { computed } from 'vue';
import {
    Dialog,
    DialogDescription,
    DialogHeader,
    DialogScrollContent,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type {
    FoundationSizingEntry,
    SupportReactions,
} from '@/composables/usePortalFrameResults';
import type { FoundationCheck } from '@/lib/portal-frame';
import {
    FOUNDATION_REFERENCE_WIND_PRESSURE_KN_M2,
    foundationWindLoadKn,
} from '@/lib/portal-frame';
import type {
    FoundationAssumptions,
    FoundationDesign,
    FoundationType,
    PortalFrameDesign,
} from '@/types/portal-frame';

const props = defineProps<{
    foundation: FoundationDesign;
    design: PortalFrameDesign;
    baseReactions: SupportReactions | null;
    foundationSizingEntries: FoundationSizingEntry[];
}>();

const emit = defineEmits<{
    updateAssumption: [key: keyof FoundationAssumptions, value: number];
}>();

const open = defineModel<boolean>('open', { required: true });

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

function updateAssumption(
    key: keyof FoundationAssumptions,
    value: string | number,
): void {
    const numeric = typeof value === 'number' ? value : Number(value);

    if (Number.isFinite(numeric)) {
        emit('updateAssumption', key, numeric);
    }
}

const foundationTypeLabels: Record<FoundationType, string> = {
    two_pile_cap: 'Two-pile pile cap',
    reinforced_pad: 'Reinforced pad',
    mass_filled: 'Mass-filled',
};

const dialogTitle = computed(
    () =>
        `${
            props.foundationSizingEntries[0]?.result.label ??
            foundationTypeLabels[props.foundation.type]
        } — calculations`,
);

const windLoadKn = computed(() => foundationWindLoadKn(props.design));

const meanHeightM = computed(() => {
    const pitchRadians = (props.design.roofPitchDeg * Math.PI) / 180;

    return (
        props.design.eavesHeight +
        (props.design.span / 4) * Math.tan(pitchRadians)
    );
});

type FormulaGroup = {
    title: string;
    formulas: string[];
};

const padGeotechnicalFormulas: FormulaGroup = {
    title: 'Geotechnical (EN 1997-1, DA1)',
    formulas: [
        'F_dz = B²·(h·γ_conc + h_soil·γ_soil) + F_Gz,k — vertical at underside incl. self-weight and soil cover',
        'e = F_Wx,k·h / F_dz ≤ B/3 — load eccentricity',
        'q_max ≤ P_bearing — peak SLS edge pressure vs presumed bearing (EC7 §6.5.2)',
        'Sliding (EC7 §6.5.3): H = γ_Q·F_Wx,k ≤ R_H = F_dz·tan δ_d + F_p, with δ_d = atan(tan δ_k / γ_φ) and passive F_p from K_p; checked for DA1-C1, DA1-C2, and C2 passive-discounted',
        'Overturning EQU (EN 1990 A1.2(A)): M_dst = γ_Q·F_Wx,k·h ≤ M_stb = γ_G,stb·F_dz·B/2',
        'Settlement (immediate, elastic): s ≈ q·B·(1−ν²)·I_s / E′',
    ],
};

const formulaGroupsByType: Record<FoundationType, FormulaGroup[]> = {
    reinforced_pad: [
        padGeotechnicalFormulas,
        {
            title: 'Structural (EN 1992-1-1)',
            formulas: [
                'Flexure: M_Ed = cantilever moment at column face from net ULS pressure; A_s,req = M_Ed / (0.87·f_yk·z), A_s,min = 0.26·(f_ctm/f_yk)·b·d (EC2 §9.2.1.1)',
                'One-way shear: V_Ed ≤ V_Rd,c = max(0.12·k·(100·ρ·f_ck)^⅓, v_min)·b·d (EC2 §6.2.2)',
                'Punching (EC2 §6.4): β = 1 + k·(M_Ed/V_Ed)·(u₁/W₁); v_Ed,0 = β·V_Ed/(u₀·d) ≤ v_Rd,max; v_Ed,1 ≤ v_Rd,c',
                'Rigidity (rigid-pad assumption): projection (B − c)/2 ≤ 2d',
                'Anchorage l_bd and laps l_0 (EC2 §8.4, §8.7)',
            ],
        },
    ],
    mass_filled: [
        padGeotechnicalFormulas,
        {
            title: 'Structural (EN 1992-1-1, plain concrete)',
            formulas: [
                'Plain footing projection (EC2 §12.9.3 exp. 12.13): a ≤ a_max = 0.85·h·√(f_ctd,pl / (3·σ_gd))',
                'f_ctd,pl = α_ct,pl·0.7·f_ctm / γ_C (EC2 §12.3.1)',
            ],
        },
    ],
    two_pile_cap: [
        {
            title: 'Loads and pile reactions',
            formulas: [
                'Vertical reaction split into permanent (dead + services) and variable (live) by the design load ratio; ULS N_ult = γ_G·(N_G + self-weight) + γ_Q·N_Q (γ_G = 1.35, γ_Q = 1.50)',
                'Cap moment: M = M_applied + F_Wx·D (horizontal wind acting over the cap depth)',
                'Pile load (2 piles): P = N/2 ± M/s ≤ pile working capacity (service)',
            ],
        },
        {
            title: 'Strut-and-tie and shear (EN 1992-1-1)',
            formulas: [
                'Tie force (CIRIA/Reynolds): T = F·(3s² − a²) / (12·s·d), with F = 2·P_ult,max; A_s,req = T / f_yd',
                'Strut angle: θ = atan(d / (s/2)) ≥ θ_min (45°)',
                'Beam shear with enhancement (EC2 §6.2.2(6)): V_red = β·P_ult,max, β = a_v/2d ≤ 1; V_red ≤ V_Rd,c',
                'Strut crushing: V ≤ V_Rd,max',
                'Node checks (EC2 §6.5.4): CCC σ_Ed = N_ult/(c_x·c_y) ≤ ν′·f_cd under the column; CCT bearing over the pile',
                'Column punching within the cap; minimum depth D ≥ 2 × pile Ø',
            ],
        },
    ],
};

const formulaGroups = computed(
    () => formulaGroupsByType[props.foundation.type],
);

function checkStatusClass(check: FoundationCheck): string {
    return check.passes ? 'text-green-600' : 'text-destructive';
}
</script>

<template>
    <Dialog v-model:open="open">
        <DialogScrollContent class="sm:max-w-3xl">
            <DialogHeader>
                <DialogTitle>{{ dialogTitle }}</DialogTitle>
                <DialogDescription>
                    Full inputs, assumptions, and formulas behind the
                    preliminary foundation sizing. Confirm with project
                    geotechnical and code checks.
                </DialogDescription>
            </DialogHeader>

            <section class="grid gap-3">
                <h3 class="text-sm font-semibold">Loading</h3>
                <div
                    class="rounded-md border border-sidebar-border/70 bg-muted/40 p-3 text-sm"
                >
                    <div
                        class="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4"
                    >
                        <div>
                            <p class="text-xs text-muted-foreground">Dead</p>
                            <p>{{ design.deadLoadKnM2.toFixed(2) }} kN/m²</p>
                        </div>
                        <div>
                            <p class="text-xs text-muted-foreground">
                                Services
                            </p>
                            <p>
                                {{ design.servicesLoadKnM2.toFixed(2) }} kN/m²
                            </p>
                        </div>
                        <div>
                            <p class="text-xs text-muted-foreground">Live</p>
                            <p>{{ design.liveLoadKnM2.toFixed(2) }} kN/m²</p>
                        </div>
                        <div>
                            <p class="text-xs text-muted-foreground">
                                Wind at base F_Wx,k
                            </p>
                            <p>{{ windLoadKn.toFixed(1) }} kN</p>
                        </div>
                    </div>
                    <p class="mt-2 text-xs text-muted-foreground">
                        F_Wx,k = q_ref × mean height × bay spacing =
                        {{ FOUNDATION_REFERENCE_WIND_PRESSURE_KN_M2 }} kN/m² ×
                        {{ meanHeightM.toFixed(2) }} m ×
                        {{ design.baySpacing.toFixed(2) }} m, applied as a
                        characteristic variable wind action.
                    </p>
                </div>
                <div
                    v-if="baseReactions"
                    class="overflow-x-auto rounded-md border border-sidebar-border/70 bg-muted/40 p-3 text-sm"
                >
                    <p class="text-xs text-muted-foreground">
                        Characteristic base reactions from the governing frame
                        analysis (the sizers apply their own partial factors).
                    </p>
                    <table class="mt-2 w-full text-left">
                        <thead>
                            <tr class="text-xs text-muted-foreground">
                                <th class="font-medium">Base</th>
                                <th class="font-medium">Vertical F_z (kN)</th>
                                <th class="font-medium">Horizontal F_x (kN)</th>
                                <th class="font-medium">Moment M (kNm)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td class="capitalize">left</td>
                                <td>
                                    {{ baseReactions.left.fzKn.toFixed(1) }}
                                </td>
                                <td>
                                    {{ baseReactions.left.fxKn.toFixed(1) }}
                                </td>
                                <td>
                                    {{
                                        baseReactions.left.momentKnm.toFixed(1)
                                    }}
                                </td>
                            </tr>
                            <tr>
                                <td class="capitalize">right</td>
                                <td>
                                    {{ baseReactions.right.fzKn.toFixed(1) }}
                                </td>
                                <td>
                                    {{ baseReactions.right.fxKn.toFixed(1) }}
                                </td>
                                <td>
                                    {{
                                        baseReactions.right.momentKnm.toFixed(1)
                                    }}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <section class="grid gap-3">
                <h3 class="text-sm font-semibold">Calculation assumptions</h3>
                <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div
                        v-for="field in visibleAssumptionFields"
                        :key="field.id"
                        class="grid gap-2"
                    >
                        <Label :for="field.id" class="text-xs">
                            {{ field.label }}
                        </Label>
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
                </div>
                <p
                    v-if="foundation.type === 'two_pile_cap'"
                    class="rounded-md border border-sidebar-border/70 bg-muted/40 p-2 text-xs text-muted-foreground"
                >
                    Cap plan, depth, and pile reactions are sized from the pile
                    geometry and column load; every strut-and-tie check is
                    listed below.
                </p>
            </section>

            <section class="grid gap-3">
                <h3 class="text-sm font-semibold">Method &amp; formulas</h3>
                <div
                    v-for="group in formulaGroups"
                    :key="group.title"
                    class="rounded-md border border-sidebar-border/70 bg-muted/40 p-3"
                >
                    <p class="text-sm font-medium">{{ group.title }}</p>
                    <ul
                        class="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground"
                    >
                        <li v-for="formula in group.formulas" :key="formula">
                            {{ formula }}
                        </li>
                    </ul>
                </div>
            </section>

            <section
                v-for="{ side, result } in foundationSizingEntries"
                :key="`${side}-${result.type}`"
                class="grid gap-3"
            >
                <h3 class="text-sm font-semibold capitalize">
                    {{ side }} base
                </h3>
                <div
                    class="rounded-md border border-sidebar-border/70 bg-muted/40 p-3 text-sm"
                >
                    <p>
                        Sized: {{ result.dimensions.widthM.toFixed(2) }}m ×
                        {{ result.dimensions.depthM.toFixed(2) }}m ×
                        {{ result.dimensions.heightM.toFixed(2) }}m
                    </p>
                    <p v-if="result.reinforcement" class="mt-1">
                        Rebar: T{{
                            result.reinforcement.barDiameterMm.toFixed(0)
                        }}
                        @ {{ result.reinforcement.spacingMm.toFixed(0) }}mm each
                        way
                    </p>
                    <p v-if="result.pileCap" class="mt-1">
                        Piles: {{ result.pileCap.pileCount }} ×
                        {{ (result.pileCap.pileDiameterM * 1000).toFixed(0) }}mm
                        Ø × {{ result.pileCap.pileDepthM.toFixed(1) }}m deep,
                        {{ result.pileCap.pileSpacingM.toFixed(2) }}m c/c,
                        {{ result.pileCap.pileCompressionKn.toFixed(1) }}kN max
                    </p>

                    <div class="mt-3 overflow-x-auto">
                        <table class="w-full text-left text-xs">
                            <thead>
                                <tr class="text-muted-foreground">
                                    <th class="font-medium">Check</th>
                                    <th class="font-medium">Demand</th>
                                    <th class="font-medium">Capacity</th>
                                    <th class="font-medium">Unit</th>
                                    <th class="font-medium">Util.</th>
                                    <th class="font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr
                                    v-for="check in result.checks"
                                    :key="check.label"
                                >
                                    <td class="pr-2">{{ check.label }}</td>
                                    <td>{{ check.demand.toFixed(1) }}</td>
                                    <td>{{ check.capacity.toFixed(1) }}</td>
                                    <td>{{ check.unit }}</td>
                                    <td>{{ check.utilisation.toFixed(2) }}</td>
                                    <td :class="checkStatusClass(check)">
                                        {{ check.passes ? 'Pass' : 'Review' }}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div
                        class="mt-3 rounded-md border border-sidebar-border/70 bg-background/50 p-2"
                    >
                        <p class="text-xs font-medium">Worked calculation</p>
                        <ol
                            class="mt-1 list-decimal space-y-1 pl-4 text-xs text-muted-foreground"
                        >
                            <li
                                v-for="line in result.calculationLines"
                                :key="line"
                            >
                                {{ line }}
                            </li>
                        </ol>
                    </div>
                </div>
            </section>
        </DialogScrollContent>
    </Dialog>
</template>
