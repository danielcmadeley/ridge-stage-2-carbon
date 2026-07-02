import { CHART_CATEGORICAL_PALETTE } from '@/components/ui/chart/chart-colors';
import type { PortalFrameCarbon } from '@/lib/portal-frame/carbon/carbon';
import type { ScorsBand } from '@/lib/portal-frame/carbon/scors';
import type { FoundationSizingResult } from '@/lib/portal-frame/foundation/foundation-sizing';
import type { BuiltPortalFrame } from '@/lib/portal-frame/model/geometry-builder';
import {
    buildCarbonReportAnalytics,
    CARBON_REPORT_ROWS,
    escapeTypstContent,
    typstChartDataRows,
} from '@/lib/report/carbon-report-analytics';
import type { TypstPaperSize } from '@/lib/report/typst-paper-size';
import { factoredRafterLineLoadKnM } from '@/types/portal-frame';
import type { FoundationType, PortalFrameDesign } from '@/types/portal-frame';

export {
    CARBON_REPORT_ROWS,
    type CarbonReportRow,
} from '@/lib/report/carbon-report-analytics';

const foundationTypeLabels: Record<FoundationType, string> = {
    two_pile_cap: 'Two-pile pile cap',
    reinforced_pad: 'Reinforced pad',
    mass_filled: 'Mass-filled',
};

const scorsBandColors: Record<ScorsBand, { fill: string; text: string }> = {
    A: { fill: '#16a34a', text: '#ffffff' },
    B: { fill: '#22c55e', text: '#ffffff' },
    C: { fill: '#84cc16', text: '#ffffff' },
    D: { fill: '#eab308', text: '#000000' },
    E: { fill: '#f97316', text: '#ffffff' },
    F: { fill: '#ef4444', text: '#ffffff' },
    G: { fill: '#b91c1c', text: '#ffffff' },
};

type ChartDatum = {
    label: string;
    carbonKg: number;
};

function groupElementChartData(
    elements: ChartDatum[],
    topN = 7,
): ChartDatum[] {
    const ranked = [...elements]
        .filter((element) => element.carbonKg > 0)
        .sort((left, right) => right.carbonKg - left.carbonKg);
    const top = ranked.slice(0, topN);
    const otherCarbon = ranked
        .slice(topN)
        .reduce((total, element) => total + element.carbonKg, 0);

    if (otherCarbon > 0) {
        top.push({ label: 'Other', carbonKg: otherCarbon });
    }

    return top;
}

function typstChartLegend(
    items: ChartDatum[],
    totalCarbonKg: number,
): string {
    if (items.length === 0) {
        return '';
    }

    const rows = items
        .map((item, index) => {
            const share =
                totalCarbonKg > 0
                    ? (item.carbonKg / totalCarbonKg) * 100
                    : 0;
            const color =
                CHART_CATEGORICAL_PALETTE[
                    index % CHART_CATEGORICAL_PALETTE.length
                ];

            return `  [#circle(radius: 4pt, fill: rgb("${color}"))], [#text(size: 8.5pt)[${escapeTypstContent(item.label)}]], [#text(size: 8.5pt, fill: ridge-muted)[${formatNumber(share, 0)}%]],`;
        })
        .join('\n');

    return `#v(0.6em)
#grid(
  columns: (auto, 1fr, auto),
  row-gutter: 6pt,
  column-gutter: 8pt,
${rows}
)
`;
}

export type CarbonReportInput = {
    carbon: PortalFrameCarbon;
    design: PortalFrameDesign;
    frame: BuiltPortalFrame;
    foundationSizing?: {
        left: FoundationSizingResult;
        right: FoundationSizingResult;
    } | null;
    paperSize?: TypstPaperSize;
    generatedAt?: Date;
};

function formatNumber(value: number, fractionDigits = 0): string {
    return value.toLocaleString(undefined, {
        maximumFractionDigits: fractionDigits,
        minimumFractionDigits: fractionDigits,
    });
}

export function formatCarbonReportMass(massKg: number): string {
    if (massKg >= 1000) {
        return `${formatNumber(massKg / 1000, 2)} t`;
    }

    return `${formatNumber(massKg, 0)} kg`;
}

export function formatCarbonReportCarbon(carbonKg: number): string {
    if (carbonKg >= 1000) {
        return `${formatNumber(carbonKg / 1000, 2)} tCO2e`;
    }

    return `${formatNumber(carbonKg, 0)} kgCO2e`;
}

function formatShare(totalCarbonKg: number, carbonKg: number): string {
    if (totalCarbonKg <= 0) {
        return '0%';
    }

    return `${formatNumber((carbonKg / totalCarbonKg) * 100, 1)}%`;
}

function formatReportDate(date: Date): string {
    return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

function typstTableRow(cells: string[]): string {
    return `  ${cells.map((cell) => `[${escapeTypstContent(cell)}]`).join(', ')},\n`;
}

function chartCanvasWidth(paperSize: TypstPaperSize): number {
    return paperSize === 'a3' ? 22 : 16;
}

function chartDimension(value: number): string {
    return value.toFixed(2);
}

function cardPieChartRadius(paperSize: TypstPaperSize): string {
    return paperSize === 'a3' ? '2.80' : '1.90';
}

function cardPieInnerRadius(paperSize: TypstPaperSize): string {
    return paperSize === 'a3' ? '0.80' : '0.55';
}

function foundationCheckRows(result: FoundationSizingResult): string {
    return result.checks
        .map((row) =>
            typstTableRow([
                row.label,
                formatNumber(row.demand, row.unit === '—' ? 2 : 1),
                formatNumber(row.capacity, row.unit === '—' ? 2 : 1),
                row.unit,
                `${formatNumber(row.utilisation, row.utilisation > 99 ? 0 : 2)}${row.passes ? '' : ' !'}`,
            ]),
        )
        .join('');
}

function foundationInfoRows(result: FoundationSizingResult): string {
    const rows: string[] = [];
    const dim = result.dimensions;
    const asPerM = result.reinforcement
        ? result.reinforcement.areaMm2PerM * dim.widthM
        : 0;
    rows.push(
        typstTableRow([
            'Plan (w \u00d7 d \u00d7 h)',
            `${formatNumber(dim.widthM, 2)} m \u00d7 ${formatNumber(dim.depthM, 2)} m \u00d7 ${formatNumber(dim.heightM, 2)} m`,
        ]),
    );

    if (result.reinforcement) {
        rows.push(
            typstTableRow([
                'Bottom reinforcement',
                `T${formatNumber(result.reinforcement.barDiameterMm, 0)} @ ${formatNumber(result.reinforcement.spacingMm, 0)} mm c/c e.w. (As \u2248 ${formatNumber(asPerM, 0)} mm\u00b2/m per direction)`,
            ]),
        );
    }

    if (result.pileCap) {
        rows.push(
            typstTableRow([
                'Piles',
                `${result.pileCap.pileCount} \u00d7 \u00d8${formatNumber(result.pileCap.pileDiameterM * 1000, 0)} mm, ${formatNumber(result.pileCap.pileDepthM, 1)} m deep @ ${formatNumber(result.pileCap.pileSpacingM, 2)} m c/c`,
            ]),
            typstTableRow([
                'Pile reactions',
                `compression ${formatNumber(result.pileCap.pileCompressionKn, 0)} kN, tension ${formatNumber(result.pileCap.pileTensionKn, 0)} kN`,
            ]),
        );
    }

    rows.push(
        typstTableRow([
            'Rebar mass',
            formatCarbonReportMass(result.rebarMassKg ?? 0),
        ]),
    );

    return rows.join('');
}

function buildFoundationSizingSection(
    sizing:
        | { left: FoundationSizingResult; right: FoundationSizingResult }
        | null
        | undefined,
): string {
    if (!sizing) {
        return '';
    }

    const sides = [
        { heading: 'Left base', result: sizing.left },
        { heading: 'Right base', result: sizing.right },
    ] as const satisfies { heading: string; result: FoundationSizingResult }[];

    const blocks = sides.map(({ heading, result }) => {
        const infoTable = `#data-table(
  columns: (1.4fr, 1fr),
  align: (left, right),
${foundationInfoRows(result)})
`;
        const checksTable = `#data-table(
  columns: (1.6fr, auto, auto, auto, auto),
  inset: 6pt,
  align: (left, right, right, right, right),
  table.header([*Check*], [*Demand*], [*Capacity*], [*Unit*], [*Util*]),
${foundationCheckRows(result)})
`;
        const lines = result.calculationLines
            .map((line) => `- ${escapeTypstContent(line)}`)
            .join('\n');

        return [
            `=== ${escapeTypstContent(heading)} \u2014 ${escapeTypstContent(result.label)}`,
            infoTable,
            checksTable,
            `Calculation basis:`,
            lines,
            '',
        ].join('\n');
    });

    return [
        '#pagebreak()',
        '',
        '== Foundation sizing',
        '',
        `Open-source record of the calculations used to proportion the selected foundation type (${escapeTypstContent(foundationTypeLabels[sides[0].result.type])}). Demand, capacity and utilisation are shown for every checked limit state per support; the calculation basis records the engineering inputs and governing intermediate quantities.`,
        '',
        ...blocks,
    ].join('\n');
}

export function buildCarbonReportTypstSource(input: CarbonReportInput): string {
    const {
        carbon,
        design,
        frame,
        foundationSizing,
        paperSize = 'a4',
        generatedAt = new Date(),
    } = input;
    const { breakdown, factors } = carbon;
    const analytics = buildCarbonReportAnalytics(carbon);
    const chartWidth = chartCanvasWidth(paperSize);
    const halfChartWidth = chartWidth / 2 - 0.5;
    const cardPieRadius = cardPieChartRadius(paperSize);
    const cardPieInner = cardPieInnerRadius(paperSize);
    const scorsColors = scorsBandColors[carbon.scorsBand];

    const materialChartItems = analytics.categories.filter(
        (category) => category.carbonKg > 0,
    );
    const elementChartItems = groupElementChartData(
        analytics.elements.map((element) => ({
            label: element.label,
            carbonKg: element.carbonKg,
        })),
    );

    const elementChartData = typstChartDataRows(elementChartItems);
    const categoryChartData = typstChartDataRows(materialChartItems);
    const primaryChartData = typstChartDataRows(analytics.primaryFrameElements);
    const topContributorData = typstChartDataRows(analytics.topContributors);
    const materialLegend = typstChartLegend(
        materialChartItems,
        carbon.totalCarbonKg,
    );
    const elementLegend = typstChartLegend(
        elementChartItems,
        carbon.totalCarbonKg,
    );

    const detailedRows = analytics.elements
        .map((element) =>
            typstTableRow([
                element.label,
                formatCarbonReportMass(element.massKg),
                formatNumber(element.factor, 3),
                formatCarbonReportCarbon(element.carbonKg),
                `${formatNumber(element.sharePercent, 1)}%`,
                `${formatNumber(element.cumulativeSharePercent, 1)}%`,
                `${formatNumber(element.carbonPerFloorAreaKgM2, 1)} kgCO2e/m²`,
            ]),
        )
        .join('');

    const categoryRows = analytics.categories
        .map((category) =>
            typstTableRow([
                category.label,
                formatCarbonReportMass(category.massKg),
                formatCarbonReportCarbon(category.carbonKg),
                `${formatNumber(category.sharePercent, 1)}%`,
            ]),
        )
        .join('');

    const scorsRows = analytics.scorsBenchmark
        .map((row) =>
            typstTableRow([
                row.band,
                row.rangeLabel,
                row.isCurrent ? 'Current' : '—',
                row.distanceKgM2 === null
                    ? '—'
                    : `${formatNumber(row.distanceKgM2, 0)} kgCO2e/m² headroom`,
            ]),
        )
        .join('');

    const improvementRows = analytics.improvementNotes
        .map((note) =>
            typstTableRow([String(note.priority), note.title, note.detail]),
        )
        .join('');

    const breakdownRows = CARBON_REPORT_ROWS.map(({ label, key }) => {
        const quantity = breakdown[key];

        return typstTableRow([
            label,
            formatCarbonReportMass(quantity.massKg),
            formatCarbonReportCarbon(quantity.carbonKg),
            formatShare(carbon.totalCarbonKg, quantity.carbonKg),
        ]);
    }).join('');

    const nextBandNote =
        analytics.nextBand && analytics.distanceToNextBandKgM2 !== null
            ? `This design sits ${formatNumber(analytics.distanceToNextBandKgM2, 0)} kgCO2e/m² below the band ${analytics.nextBand} threshold.`
            : 'This design is in the highest SCORS band or already at the top of its band range.';

    const foundationSection = buildFoundationSizingSection(foundationSizing);

    return `#import "@preview/cetz:0.5.2": canvas, draw
#import "@preview/cetz-plot:0.1.4": chart

#let ridge-dark = rgb("#003723")
#let ridge-mid = rgb("#005032")
#let ridge-fuchsia = rgb("#c6128f")
#let ridge-grey = rgb("#e4e4e4")
#let ridge-muted = rgb("#003723").transparentize(40%)
#let ridge-border = rgb("#003723").transparentize(90%)
#let ridge-surface = rgb("#e4e4e4").transparentize(65%)
#let ridge-pale = rgb("#e8f3ec")
#let ridge-green-colors = (
  ridge-dark,
  ridge-mid,
  rgb("#1f7a4d"),
  rgb("#3da56a"),
  rgb("#5fbf82"),
  rgb("#8fd4a8"),
  rgb("#b8e6c9"),
)
#let chart-colors = (
  ..ridge-green-colors,
  ridge-fuchsia,
  rgb("#64748b"),
  rgb("#94a3b8"),
  rgb("#cbd5e1"),
)
#let pie-colors = (
  rgb("#86efac"),
  rgb("#f9a8d4"),
  rgb("#7dd3fc"),
  rgb("#fcd34d"),
  rgb("#c4b5fd"),
  rgb("#fca5a5"),
  rgb("#5eead4"),
  rgb("#cbd5e1"),
  rgb("#93c5fd"),
  rgb("#fde047"),
)
#let pie-slice-style = (idx) => (fill: pie-colors.at(calc.rem(idx, pie-colors.len())), stroke: none)
#let chart-bar-style = (idx) => (fill: chart-colors.at(calc.rem(idx, chart-colors.len())), stroke: none)

#let eyebrow(content) = text(
  size: 8pt,
  fill: ridge-fuchsia,
  weight: "medium",
  tracking: 0.12em,
)[#upper(content)]

#let stat-card(label, value, detail: none) = block(
  width: 100%,
  stroke: 0.5pt + ridge-border,
  fill: ridge-surface,
  radius: 6pt,
  inset: 10pt,
)[
  #text(size: 8pt, fill: ridge-muted)[#label]
  #v(0.25em)
  #text(size: 13pt, weight: "bold", fill: ridge-dark)[#value]
  #if detail != none [
    #v(0.15em)
    #text(size: 7.5pt, fill: ridge-muted)[#detail]
  ]
]

#let chart-card(title, description, body) = block(
  width: 100%,
  stroke: 0.5pt + ridge-border,
  fill: white,
  radius: 8pt,
  inset: 12pt,
)[
  #text(size: 10pt, weight: "bold", fill: ridge-mid)[#title]
  #v(0.25em)
  #text(size: 8.5pt, fill: ridge-muted)[#description]
  #v(0.6em)
  #body
]

#let section-intro(title, description) = [
  #text(size: 14pt, weight: "bold", fill: ridge-dark)[#title]
  #v(0.35em)
  #text(size: 9.5pt, fill: ridge-muted)[#description]
  #v(0.9em)
]

#let data-table(..args) = table(
  stroke: 0.5pt + ridge-border,
  inset: 8pt,
  fill: (x, y) => if y == 0 { ridge-surface } else { white },
  ..args,
)

#set page(
  paper: "${paperSize}",
  margin: (top: 2.2cm, bottom: 2cm, left: 2cm, right: 2cm),
  fill: white,
  header: [
    #line(length: 100%, stroke: 2pt + ridge-dark)
    #v(0.35em)
    #grid(
      columns: (auto, 1fr, auto),
      column-gutter: 10pt,
      align: (left + horizon, left + horizon, right + horizon),
      text(size: 11pt, weight: "bold", fill: ridge-dark)[Ridge],
      text(size: 8.5pt, fill: ridge-muted)[Portal frame design and carbon · Embodied carbon report],
      text(size: 8.5pt, fill: ridge-muted)[${formatReportDate(generatedAt)}],
    )
  ],
  footer: context [
    #line(length: 100%, stroke: 0.5pt + ridge-border)
    #v(0.35em)
    #grid(
      columns: (1fr, auto),
      text(size: 8pt, fill: ridge-muted)[Portal frame design and carbon · ridge.co.uk],
      text(size: 8pt, fill: ridge-muted)[#counter(page).display()],
    )
  ],
)

#set text(size: 10pt)
#set par(justify: true, leading: 0.68em, spacing: 0.68em)
#show heading.where(level: 1): set text(size: 22pt, weight: "bold", fill: ridge-dark)
#show heading.where(level: 2): set text(size: 13pt, weight: "bold", fill: ridge-dark)
#show heading.where(level: 3): set text(size: 11pt, weight: "bold", fill: ridge-mid)

#eyebrow[Embodied carbon report]

#v(0.4em)

= Embodied carbon report

#v(0.35em)

#text(size: 10.5pt, fill: ridge-muted)[
  A1–A3 estimate from element mass × factor. Includes a 250 mm ground floor slab with H12 top and bottom at 200 mm centres, plus 10% steel for connections. Use this report to compare schemes and identify the elements driving embodied carbon.
]

#v(0.8em)

#grid(
  columns: (auto, auto),
  column-gutter: 8pt,
  [
    #box(
      fill: ridge-dark,
      inset: (x: 10pt, y: 5pt),
      radius: 999pt,
    )[
      #text(size: 8pt, fill: white)[${formatCarbonReportCarbon(carbon.totalCarbonKg)}]
    ]
  ],
  [
    #box(
      fill: white,
      stroke: 0.5pt + ridge-border,
      inset: (x: 10pt, y: 5pt),
      radius: 999pt,
    )[
      #text(size: 8pt, fill: ridge-dark)[${formatNumber(design.span, 0)} m span · ${formatNumber(carbon.floorAreaM2, 0)} m² GIFA]
    ]
  ],
)

#v(0.9em)

#grid(
  columns: (1fr, 1fr),
  row-gutter: 10pt,
  column-gutter: 10pt,
  stat-card(
    [Total embodied carbon],
    [${formatCarbonReportCarbon(carbon.totalCarbonKg)}],
  ),
  stat-card(
    [Carbon intensity],
    [${formatNumber(carbon.carbonIntensityKgM2, 0)} kgCO2e/m²],
    detail: [${formatNumber(carbon.floorAreaM2, 0)} m² GIFA],
  ),
  stat-card(
    [Primary steel sections],
    [${formatCarbonReportCarbon(carbon.steelSectionsCarbonKg)}],
    detail: [excl. connections allowance],
  ),
  [
    #block(
      width: 100%,
      stroke: 0.5pt + ridge-border,
      fill: ridge-surface,
      radius: 6pt,
      inset: 10pt,
    )[
      #align(center)[
        #text(size: 8pt, fill: ridge-muted)[IStructE SCORS]
        #v(0.3em)
        #box(
          fill: rgb("${scorsColors.fill}"),
          inset: (x: 14pt, y: 8pt),
          radius: 6pt,
        )[
          #text(size: 22pt, weight: "bold", fill: rgb("${scorsColors.text}"))[${carbon.scorsBand}]
        ]
      ]
    ]
  ],
)

#v(0.8em)

#block(
  width: 100%,
  stroke: 0.5pt + ridge-border,
  fill: ridge-surface,
  radius: 6pt,
  inset: 10pt,
)[
  #grid(
    columns: (1fr, auto),
    text(size: 8.5pt, fill: ridge-muted)[Steel sections subtotal],
    text(size: 9pt, weight: "bold", fill: ridge-dark)[${formatCarbonReportCarbon(carbon.steelSectionsCarbonKg)}],
  )
]

#pagebreak()

== Visual overview

#section-intro(
  [Where carbon is concentrated],
  [Charts grouped by material category and individual element, matching the scene editor panel. Use them to compare alternative schemes and spot disproportionate contributors.],
)

#grid(
  columns: (1fr, 1fr),
  gutter: 12pt,
  chart-card(
    [By material],
    [Carbon grouped into structural material categories.],
    [
      #align(center)[
        #canvas(length: 1cm, {
          chart.piechart(
            (
${categoryChartData}            ),
            label-key: none,
            value-key: 1,
            radius: ${cardPieRadius},
            slice-style: pie-slice-style,
            stroke: 0.5pt + white,
            outer-label: (content: none),
            legend: (label: none),
          )
        })
      ]
${materialLegend}    ],
  ),
  chart-card(
    [By element],
    [Largest individual contributors to embodied carbon.],
    [
      #align(center)[
        #canvas(length: 1cm, {
          chart.piechart(
            (
${elementChartData}            ),
            label-key: none,
            value-key: 1,
            radius: ${cardPieRadius},
            slice-style: pie-slice-style,
            stroke: 0.5pt + white,
            inner-radius: ${cardPieInner},
            outer-label: (content: none),
            legend: (label: none),
          )
        })
      ]
${elementLegend}    ],
  ),
)

#v(1.2em)

=== Total carbon by element

#canvas({
  draw.set-style(
    legend: (fill: white, stroke: 0.5pt + ridge-border),
    columnchart: (bar-width: 0.75),
  )
  chart.columnchart(
    (
${elementChartData}    ),
    size: (${chartDimension(chartWidth)}, 9),
    label-key: 0,
    value-key: 1,
    x-label: none,
    y-label: [Carbon (tCO2e)],
    bar-style: chart-bar-style,
  )
})

#pagebreak()

== Primary frame comparison

#section-intro(
  [Primary steel members],
  [Columns, rafters, gable columns, and haunches usually dominate the primary steel takeoff. Compare their relative contributions before reviewing secondary steel, foundations, or slab scope.],
)

#grid(
  columns: (1fr, 1fr),
  gutter: 12pt,
  chart-card(
    [Primary members],
    [Horizontal bars comparing frame member carbon.],
    [
      #canvas({
        draw.set-style(columnchart: (bar-width: 0.7))
        chart.barchart(
          (
${primaryChartData}          ),
          size: (${chartDimension(halfChartWidth)}, 5.5),
          label-key: 0,
          value-key: 1,
          x-label: [Carbon (tCO2e)],
          y-label: none,
          bar-style: chart-bar-style,
        )
      })
    ],
  ),
  chart-card(
    [Top five contributors],
    [Highest absolute carbon lines across all elements.],
    [
      #canvas({
        draw.set-style(columnchart: (bar-width: 0.7))
        chart.columnchart(
          (
${topContributorData}          ),
          size: (${chartDimension(halfChartWidth)}, 5.5),
          label-key: 0,
          value-key: 1,
          x-label: none,
          y-label: [Carbon (tCO2e)],
          bar-style: chart-bar-style,
        )
      })
    ],
  ),
)

#v(1em)

#data-table(
  columns: (1.2fr, auto, auto, auto),
  align: (left, right, right, right),
  table.header(
    [*Primary member*], [*Mass*], [*Carbon*], [*Share of total*],
  ),
${analytics.primaryFrameElements
    .map((element) =>
        typstTableRow([
            element.label,
            formatCarbonReportMass(element.massKg),
            formatCarbonReportCarbon(element.carbonKg),
            `${formatNumber(element.sharePercent, 1)}%`,
        ]),
    )
    .join('')}
)

#pagebreak()

== Detailed element data

#section-intro(
  [Benchmarking table],
  [Mass, carbon factor, absolute carbon, share of total, cumulative share, and carbon intensity per m² of gross internal floor area for every modelled element.],
)

#data-table(
  columns: (1.3fr, auto, auto, auto, auto, auto, auto),
  inset: 6pt,
  align: (left, right, right, right, right, right, right),
  table.header(
    [*Element*], [*Mass*], [*Factor*], [*Carbon*], [*Share*], [*Cumulative*], [*Per m² GIFA*],
  ),
${detailedRows})

#v(1.5em)

== Material groups

#data-table(
  columns: (1.6fr, auto, auto, auto),
  align: (left, right, right, right),
  table.header(
    [*Group*], [*Mass*], [*Carbon*], [*Share*],
  ),
${categoryRows})

#v(1.2em)

#canvas({
  draw.set-style(columnchart: (bar-width: 0.65))
  chart.columnchart(
    (
${categoryChartData}    ),
    size: (${chartDimension(chartWidth)}, 6),
    label-key: 0,
    value-key: 1,
    x-label: none,
    y-label: [Carbon (tCO2e)],
    bar-style: chart-bar-style,
  )
})

#pagebreak()

== Improvement focus

#section-intro(
  [Optimisation priorities],
  [Ranked by absolute carbon contribution. Start with the highest lines when optimising section sizes, spacing, foundation assumptions, or slab scope.],
)

#data-table(
  columns: (auto, 1.1fr, 2fr),
  align: (center, left, left),
  table.header(
    [*Rank*], [*Contributor*], [*What to review*],
  ),
${improvementRows})

#v(1.2em)

#block(
  width: 100%,
  stroke: 0.5pt + ridge-border,
  fill: ridge-pale,
  radius: 8pt,
  inset: 12pt,
)[
  #text(size: 10pt, weight: "bold", fill: ridge-mid)[Quick observations]
  #v(0.5em)
  ${analytics.topContributors
      .slice(0, 3)
      .map(
          (element, index) =>
              `- #strong[${escapeTypstContent(`${index + 1}. ${element.label}`)}] contributes ${formatNumber(element.sharePercent, 1)}% (${formatCarbonReportCarbon(element.carbonKg)}) of total carbon.`,
      )
      .join('\n  ')}

  - #strong[Primary steel frame] accounts for ${formatNumber(analytics.categories.find((category) => category.category === 'primary_steel')?.sharePercent ?? 0, 1)}% of the total when columns, rafters, haunches, ties, and bracing are grouped together.
  - #strong[Ground floor slab] accounts for ${formatNumber(analytics.categories.find((category) => category.category === 'slab')?.sharePercent ?? 0, 1)}% — confirm whether slab scope should be included when comparing against other benchmarks.
  - ${nextBandNote}
]

#pagebreak()

== Design parameters

#section-intro(
  [Scheme inputs],
  [Record these values when comparing alternative schemes or external benchmarks.],
)

#data-table(
  columns: (1.4fr, 1fr),
  align: (left, right),
${typstTableRow(['Span', `${formatNumber(design.span, 1)} m`])}${typstTableRow(['Building length', `${formatNumber(design.buildingLength, 1)} m`])}${typstTableRow(['Eaves height', `${formatNumber(design.eavesHeight, 1)} m`])}${typstTableRow(['Bay spacing', `${formatNumber(design.baySpacing, 1)} m`])}${typstTableRow(['Roof pitch', `${formatNumber(design.roofPitchDeg, 1)}°`])}${typstTableRow(['Dead load', `${formatNumber(design.deadLoadKnM2, 2)} kN/m²`])}${typstTableRow(['Services load', `${formatNumber(design.servicesLoadKnM2, 2)} kN/m²`])}${typstTableRow(['Live load', `${formatNumber(design.liveLoadKnM2, 2)} kN/m²`])}${typstTableRow(['Column restraint', design.columnRestraint === 'restrained' ? 'Restrained' : 'Unrestrained'])}${typstTableRow(['Foundation type', foundationTypeLabels[design.foundation.type]])}${typstTableRow(['Rafter section', frame.rafter.name])}${typstTableRow(['Column section', frame.column.name])}${typstTableRow(['Lookup span', `${formatNumber(frame.lookupSpanM, 0)} m`])}${typstTableRow(['Rafter line load (characteristic)', `${formatNumber(frame.rafterLineLoadKnM, 2)} kN/m`])}${typstTableRow(['Rafter line load (factored, γ_G·(dead+services) + γ_Q·live)', `${formatNumber(factoredRafterLineLoadKnM(design), 2)} kN/m`])}${typstTableRow(['Report date', formatReportDate(generatedAt)])}
)

#v(1.5em)
${foundationSection}
== SCORS benchmarking

#section-intro(
  [IStructE SCORS bands],
  [Structural Carbon Rating Scheme bands in 50 kgCO2e/m² steps from a band-A ceiling of 150 kgCO2e/m².],
)

#data-table(
  columns: (auto, 1.4fr, auto, auto),
  align: (center, left, center, right),
  table.header(
    [*Band*], [*Intensity range*], [*Status*], [*Headroom*],
  ),
${scorsRows})

#v(1.5em)

== Summary results

#data-table(
  columns: (1.4fr, 1fr),
  align: (left, right),
${typstTableRow(['Total embodied carbon', formatCarbonReportCarbon(carbon.totalCarbonKg)])}${typstTableRow(['Carbon intensity', `${formatNumber(carbon.carbonIntensityKgM2, 0)} kgCO2e/m²`])}${typstTableRow(['Gross internal floor area', `${formatNumber(carbon.floorAreaM2, 0)} m²`])}${typstTableRow(['IStructE SCORS band', carbon.scorsBand])}${typstTableRow(['Steel sections subtotal', formatCarbonReportCarbon(carbon.steelSectionsCarbonKg)])}
)

#v(1.5em)

== Element breakdown (compact)

#data-table(
  columns: (1.6fr, auto, auto, auto),
  align: (left, right, right, right),
  table.header(
    [*Element*], [*Mass*], [*Carbon*], [*Share*],
  ),
${breakdownRows})

#v(1.5em)

== Carbon factors

#data-table(
  columns: (1.6fr, auto),
  align: (left, right),
  table.header(
    [*Material*], [*Factor (kgCO2e/kg)*],
  ),
${typstTableRow(['Hot-rolled steel sections', formatNumber(factors.steelSection, 3)])}${typstTableRow(['Hot-dip galvanized steel', formatNumber(factors.galvanizedSteel, 3)])}${typstTableRow(['28/35 MPa concrete', formatNumber(factors.concrete, 3)])}${typstTableRow(['Steel rebar', formatNumber(factors.rebar, 3)])}
)

#v(1.5em)

== Methodology

#block(
  width: 100%,
  stroke: 0.5pt + ridge-border,
  fill: ridge-surface,
  radius: 8pt,
  inset: 12pt,
)[
  - Hot-rolled steel sections include columns, gable columns, rafters, haunches, eaves ties, bracing, and a 10% allowance for connections.
  - Side rails and purlins use the galvanized steel factor (${formatNumber(factors.galvanizedSteel, 3)} kgCO2e/kg), which is higher than hot-rolled sections (${formatNumber(factors.steelSection, 3)} kgCO2e/kg).
  - Foundation concrete volume is taken from the sized footing or pile geometry; pad reinforcement is included where the model sizes a bottom mat.
  - The ground floor slab is modelled as 250 mm concrete with H12 bars top and bottom each way at 200 mm centres.
  - Carbon intensity is reported over gross internal floor area (span × building length).
  - SCORS bands follow IStructE guidance in 50 kgCO2e/m² steps from a band-A ceiling of 150 kgCO2e/m².
  - Charts plot carbon in tonnes CO2e for readability; tables retain kg or tonnes depending on magnitude.
]
`;
}
