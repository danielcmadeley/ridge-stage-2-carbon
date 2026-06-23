import type {
    PortalFrameCarbon,
    PortalFrameCarbonBreakdown,
} from '@/lib/portal-frame/carbon';
import type { CarbonFactors } from '@/lib/portal-frame/carbon-factors';
import { SCORS_BANDS, type ScorsBand } from '@/lib/portal-frame/scors';

export type CarbonReportRow = {
    label: string;
    key: keyof PortalFrameCarbonBreakdown;
};

export const CARBON_REPORT_ROWS: CarbonReportRow[] = [
    { label: 'Columns', key: 'columns' },
    { label: 'Gable columns', key: 'gableColumns' },
    { label: 'Rafters', key: 'rafters' },
    { label: 'Haunches', key: 'haunches' },
    { label: 'Eaves ties', key: 'ties' },
    { label: 'Bracing', key: 'braces' },
    { label: 'Side rails', key: 'sideRails' },
    { label: 'Purlins', key: 'purlins' },
    { label: 'Foundation concrete', key: 'concrete' },
    { label: 'Foundation rebar', key: 'rebar' },
    { label: 'Slab concrete', key: 'slabConcrete' },
    { label: 'Slab rebar', key: 'slabRebar' },
    { label: 'Connections', key: 'connections' },
];

export type CarbonMaterialCategory =
    | 'primary_steel'
    | 'connections'
    | 'secondary_steel'
    | 'foundations'
    | 'slab';

export type CarbonElementStat = {
    label: string;
    key: keyof PortalFrameCarbonBreakdown;
    massKg: number;
    carbonKg: number;
    sharePercent: number;
    cumulativeSharePercent: number;
    carbonPerFloorAreaKgM2: number;
    factor: number;
    materialCategory: CarbonMaterialCategory;
};

export type CarbonCategorySummary = {
    category: CarbonMaterialCategory;
    label: string;
    massKg: number;
    carbonKg: number;
    sharePercent: number;
};

export type CarbonImprovementNote = {
    priority: number;
    title: string;
    detail: string;
};

export type CarbonScorsBenchmarkRow = {
    band: ScorsBand;
    rangeLabel: string;
    isCurrent: boolean;
    distanceKgM2: number | null;
};

export type CarbonReportAnalytics = {
    elements: CarbonElementStat[];
    categories: CarbonCategorySummary[];
    primaryFrameElements: CarbonElementStat[];
    topContributors: CarbonElementStat[];
    improvementNotes: CarbonImprovementNote[];
    scorsBenchmark: CarbonScorsBenchmarkRow[];
    distanceToNextBandKgM2: number | null;
    nextBand: ScorsBand | null;
};

const categoryLabels: Record<CarbonMaterialCategory, string> = {
    primary_steel: 'Primary steel frame',
    connections: 'Connections allowance',
    secondary_steel: 'Secondary steel (rails & purlins)',
    foundations: 'Foundations',
    slab: 'Ground floor slab',
};

const elementCategoryMap: Record<
    keyof PortalFrameCarbonBreakdown,
    CarbonMaterialCategory
> = {
    columns: 'primary_steel',
    gableColumns: 'primary_steel',
    rafters: 'primary_steel',
    haunches: 'primary_steel',
    ties: 'primary_steel',
    braces: 'primary_steel',
    sideRails: 'secondary_steel',
    purlins: 'secondary_steel',
    concrete: 'foundations',
    rebar: 'foundations',
    slabConcrete: 'slab',
    slabRebar: 'slab',
    connections: 'connections',
};

const primaryFrameKeys: (keyof PortalFrameCarbonBreakdown)[] = [
    'columns',
    'gableColumns',
    'rafters',
    'haunches',
];

function factorForElement(
    key: keyof PortalFrameCarbonBreakdown,
    factors: CarbonFactors,
): number {
    switch (key) {
        case 'sideRails':
        case 'purlins':
            return factors.galvanizedSteel;
        case 'concrete':
        case 'slabConcrete':
            return factors.concrete;
        case 'rebar':
        case 'slabRebar':
            return factors.rebar;
        default:
            return factors.steelSection;
    }
}

function sharePercent(totalCarbonKg: number, carbonKg: number): number {
    if (totalCarbonKg <= 0) {
        return 0;
    }

    return (carbonKg / totalCarbonKg) * 100;
}

function improvementDetail(stat: CarbonElementStat): string {
    switch (stat.key) {
        case 'columns':
        case 'gableColumns':
            return 'Column mass is driven by eaves height, restraint condition, and the P399 UB selected for the lookup span. A lighter column section or shorter unsupported height reduces this line directly.';
        case 'rafters':
            return 'Rafters are the largest primary member run and scale with building length and line load. Review span, imposed loads, and whether a lighter UB still passes governing checks.';
        case 'haunches':
            return 'Haunches are modelled as half of the rafter section over the haunch length. Combined rafter-plus-haunch carbon often responds more to rafter sizing than to haunch geometry alone.';
        case 'ties':
            return 'Eaves tie carbon scales with building length. Check whether tie section or quantity can be reduced without compromising stability assumptions.';
        case 'braces':
            return 'Bracing steel is sensitive to bay spacing and bracing arrangement. Wider bays can increase bracing demand and member lengths.';
        case 'sideRails':
        case 'purlins':
            return 'Secondary steel uses the higher galvanized factor. Review rail and purlin spacing, section gauge, and whether a lighter Z/C profile is feasible.';
        case 'concrete':
            return 'Foundation concrete volume follows reaction sizing and foundation type. Bearing pressure, pile count, and cap dimensions all move this line.';
        case 'rebar':
            return 'Foundation rebar is sized from pad dimensions and cover assumptions. Larger pads or tighter spacing increase reinforcement mass.';
        case 'slabConcrete':
            return 'Slab concrete scales linearly with gross floor area and slab depth (modelled at 250 mm). Confirm slab scope when benchmarking against other buildings.';
        case 'slabRebar':
            return 'Slab rebar follows the fixed H12 top-and-bottom mat at 200 mm centres. Area-driven reductions only come from a smaller footprint or a lighter mat specification.';
        case 'connections':
            return 'Connections are included as a 10% allowance on primary steel section mass. Detailed connection design or fabrication data could refine this placeholder.';
    }
}

function buildImprovementNotes(
    elements: CarbonElementStat[],
): CarbonImprovementNote[] {
    const ranked = [...elements]
        .filter((element) => element.carbonKg > 0)
        .sort((left, right) => right.carbonKg - left.carbonKg);

    return ranked.slice(0, 6).map((stat, index) => ({
        priority: index + 1,
        title: `${stat.label} — ${stat.sharePercent.toFixed(0)}% of total carbon`,
        detail: improvementDetail(stat),
    }));
}

function buildScorsBenchmark(
    intensityKgM2: number,
    currentBand: ScorsBand,
): CarbonScorsBenchmarkRow[] {
    return SCORS_BANDS.map((definition) => {
        const upperBound = definition.upperBoundKgM2;
        const rangeLabel =
            upperBound === null
                ? `≥ ${definition.lowerBoundKgM2} kgCO2e/m²`
                : `${definition.lowerBoundKgM2} to below ${upperBound} kgCO2e/m²`;

        let distanceKgM2: number | null = null;

        if (definition.band === currentBand) {
            distanceKgM2 =
                upperBound === null ? 0 : upperBound - intensityKgM2;
        }

        return {
            band: definition.band,
            rangeLabel,
            isCurrent: definition.band === currentBand,
            distanceKgM2,
        };
    });
}

function nextScorsBand(currentBand: ScorsBand): ScorsBand | null {
    const index = SCORS_BANDS.findIndex((entry) => entry.band === currentBand);

    if (index < 0 || index >= SCORS_BANDS.length - 1) {
        return null;
    }

    return SCORS_BANDS[index + 1].band;
}

export function buildCarbonReportAnalytics(
    carbon: PortalFrameCarbon,
): CarbonReportAnalytics {
    const { breakdown, factors, totalCarbonKg, floorAreaM2 } = carbon;
    let cumulativeShare = 0;

    const elements: CarbonElementStat[] = CARBON_REPORT_ROWS.map(
        ({ label, key }) => {
            const quantity = breakdown[key];
            const elementShare = sharePercent(totalCarbonKg, quantity.carbonKg);
            cumulativeShare += elementShare;

            return {
                label,
                key,
                massKg: quantity.massKg,
                carbonKg: quantity.carbonKg,
                sharePercent: elementShare,
                cumulativeSharePercent: cumulativeShare,
                carbonPerFloorAreaKgM2:
                    floorAreaM2 > 0 ? quantity.carbonKg / floorAreaM2 : 0,
                factor: factorForElement(key, factors),
                materialCategory: elementCategoryMap[key],
            };
        },
    );

    const categoryTotals = new Map<
        CarbonMaterialCategory,
        { massKg: number; carbonKg: number }
    >();

    for (const element of elements) {
        const current = categoryTotals.get(element.materialCategory) ?? {
            massKg: 0,
            carbonKg: 0,
        };

        categoryTotals.set(element.materialCategory, {
            massKg: current.massKg + element.massKg,
            carbonKg: current.carbonKg + element.carbonKg,
        });
    }

    const categories: CarbonCategorySummary[] = (
        Object.keys(categoryLabels) as CarbonMaterialCategory[]
    ).map((category) => {
        const totals = categoryTotals.get(category) ?? {
            massKg: 0,
            carbonKg: 0,
        };

        return {
            category,
            label: categoryLabels[category],
            massKg: totals.massKg,
            carbonKg: totals.carbonKg,
            sharePercent: sharePercent(totalCarbonKg, totals.carbonKg),
        };
    });

    const primaryFrameElements = elements.filter((element) =>
        primaryFrameKeys.includes(element.key),
    );

    const topContributors = [...elements]
        .filter((element) => element.carbonKg > 0)
        .sort((left, right) => right.carbonKg - left.carbonKg)
        .slice(0, 5);

    const currentDefinition = SCORS_BANDS.find(
        (entry) => entry.band === carbon.scorsBand,
    );
    const distanceToNextBandKgM2 =
        currentDefinition?.upperBoundKgM2 === null ||
        currentDefinition?.upperBoundKgM2 === undefined
            ? null
            : currentDefinition.upperBoundKgM2 - carbon.carbonIntensityKgM2;

    return {
        elements,
        categories: categories.filter((category) => category.carbonKg > 0),
        primaryFrameElements,
        topContributors,
        improvementNotes: buildImprovementNotes(elements),
        scorsBenchmark: buildScorsBenchmark(
            carbon.carbonIntensityKgM2,
            carbon.scorsBand,
        ),
        distanceToNextBandKgM2,
        nextBand: nextScorsBand(carbon.scorsBand),
    };
}

export function carbonChartTonnes(carbonKg: number): number {
    return carbonKg / 1000;
}

/** Escape text embedded inside Typst content blocks (`[...]`). */
export function escapeTypstContent(text: string): string {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/#/g, '\\#')
        .replace(/</g, '\\<')
        .replace(/>/g, '\\>')
        .replace(/\[/g, '\\[')
        .replace(/\]/g, '\\]');
}

export function typstChartDataRow(label: string, carbonKg: number): string {
    return `  ([${escapeTypstContent(label)}], ${carbonChartTonnes(carbonKg).toFixed(3)}),\n`;
}

export function typstChartDataRows(
    rows: { label: string; carbonKg: number }[],
): string {
    return rows.map((row) => typstChartDataRow(row.label, row.carbonKg)).join('');
}
