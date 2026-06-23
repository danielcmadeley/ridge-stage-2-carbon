import {
    buildCarbonReportAnalytics,
    CARBON_REPORT_ROWS,
    escapeTypstContent,
    typstChartDataRows,
} from '@/lib/carbon-report-analytics';
import type { BuiltPortalFrame } from '@/lib/portal-frame/geometry-builder';
import type { PortalFrameCarbon } from '@/lib/portal-frame/carbon';
import type { TypstPaperSize } from '@/lib/typst-paper-size';
import type { FoundationType, PortalFrameDesign } from '@/types/portal-frame';

export { CARBON_REPORT_ROWS, type CarbonReportRow } from '@/lib/carbon-report-analytics';

const foundationTypeLabels: Record<FoundationType, string> = {
    two_pile_cap: 'Two-pile pile cap',
    reinforced_pad: 'Reinforced pad',
    mass_filled: 'Mass-filled',
};

export type CarbonReportInput = {
    carbon: PortalFrameCarbon;
    design: PortalFrameDesign;
    frame: BuiltPortalFrame;
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

export function buildCarbonReportTypstSource(input: CarbonReportInput): string {
    const {
        carbon,
        design,
        frame,
        paperSize = 'a4',
        generatedAt = new Date(),
    } = input;
    const { breakdown, factors } = carbon;
    const analytics = buildCarbonReportAnalytics(carbon);
    const chartWidth = chartCanvasWidth(paperSize);
    const halfChartWidth = chartWidth / 2 - 0.5;
    const pieRadius = chartDimension(halfChartWidth / 2.2);
    const pieInnerRadius = chartDimension(halfChartWidth / 6);

    const elementChartData = typstChartDataRows(
        analytics.elements.filter((element) => element.carbonKg > 0),
    );
    const categoryChartData = typstChartDataRows(analytics.categories);
    const primaryChartData = typstChartDataRows(analytics.primaryFrameElements);
    const topContributorData = typstChartDataRows(analytics.topContributors);

    const detailedRows = analytics.elements.map((element) =>
        typstTableRow([
            element.label,
            formatCarbonReportMass(element.massKg),
            formatNumber(element.factor, 3),
            formatCarbonReportCarbon(element.carbonKg),
            `${formatNumber(element.sharePercent, 1)}%`,
            `${formatNumber(element.cumulativeSharePercent, 1)}%`,
            `${formatNumber(element.carbonPerFloorAreaKgM2, 1)} kgCO2e/m²`,
        ]),
    ).join('');

    const categoryRows = analytics.categories.map((category) =>
        typstTableRow([
            category.label,
            formatCarbonReportMass(category.massKg),
            formatCarbonReportCarbon(category.carbonKg),
            `${formatNumber(category.sharePercent, 1)}%`,
        ]),
    ).join('');

    const scorsRows = analytics.scorsBenchmark.map((row) =>
        typstTableRow([
            row.band,
            row.rangeLabel,
            row.isCurrent ? 'Current' : '—',
            row.distanceKgM2 === null
                ? '—'
                : `${formatNumber(row.distanceKgM2, 0)} kgCO2e/m² headroom`,
        ]),
    ).join('');

    const improvementRows = analytics.improvementNotes.map((note) =>
        typstTableRow([
            String(note.priority),
            note.title,
            note.detail,
        ]),
    ).join('');

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

    return `#import "@preview/cetz:0.5.2": canvas, draw
#import "@preview/cetz-plot:0.1.4": chart

#let ridge-dark = rgb("#003723")
#let ridge-mid = rgb("#005032")
#let ridge-accent = rgb("#C6128F")
#let ridge-muted = luma(140)
#let ridge-pale = rgb("#e8f3ec")
#let chart-colors = (
  ridge-dark,
  ridge-mid,
  rgb("#1f7a4d"),
  rgb("#3da56a"),
  ridge-accent,
  rgb("#64748b"),
  rgb("#94a3b8"),
  rgb("#cbd5e1"),
  rgb("#475569"),
  rgb("#334155"),
  rgb("#0f766e"),
  rgb("#0891b2"),
  rgb("#7c3aed"),
)

#let chart-gradient = gradient.linear(..chart-colors)
#let chart-bar-style = (idx) => (fill: chart-colors.at(calc.rem(idx, chart-colors.len())), stroke: none)

#set page(
  paper: "${paperSize}",
  margin: (top: 2cm, bottom: 2cm, left: 2cm, right: 2cm),
  fill: white,
  header: [
    #line(length: 100%, stroke: 2pt + ridge-dark)
    #v(0.4em)
    #grid(
      columns: (1fr, auto),
      text(size: 9pt, fill: ridge-muted)[Detailed embodied carbon report],
      align(right)[
        #text(size: 9pt, fill: ridge-muted)[${formatReportDate(generatedAt)}]
      ],
    )
  ],
  footer: context [
    #align(right)[
      #text(size: 9pt, fill: ridge-muted)[#counter(page).display()]
    ]
  ],
)

#set text(size: 10pt)
#set par(justify: true, leading: 0.65em, spacing: 0.65em)
#show heading.where(level: 1): set text(size: 18pt, weight: "bold", fill: ridge-dark)
#show heading.where(level: 2): set text(size: 12pt, weight: "bold", fill: ridge-mid)
#show heading.where(level: 3): set text(size: 11pt, weight: "bold", fill: ridge-mid)

= Embodied Carbon Report

#block(
  fill: ridge-pale,
  inset: 12pt,
  radius: 4pt,
  width: 100%,
)[
  #grid(
    columns: (1fr, 1fr, 1fr, auto),
    gutter: 12pt,
    align: (left, left, left, center),
    [
      #text(size: 9pt, fill: ridge-muted)[Total embodied carbon]
      #v(0.2em)
      #text(size: 16pt, weight: "bold", fill: ridge-dark)[${formatCarbonReportCarbon(carbon.totalCarbonKg)}]
    ],
    [
      #text(size: 9pt, fill: ridge-muted)[Carbon intensity]
      #v(0.2em)
      #text(size: 16pt, weight: "bold", fill: ridge-dark)[${formatNumber(carbon.carbonIntensityKgM2, 0)} kgCO2e/m²]
      #v(0.1em)
      #text(size: 8pt, fill: ridge-muted)[${formatNumber(carbon.floorAreaM2, 0)} m² GIFA]
    ],
    [
      #text(size: 9pt, fill: ridge-muted)[Primary steel sections]
      #v(0.2em)
      #text(size: 16pt, weight: "bold", fill: ridge-dark)[${formatCarbonReportCarbon(carbon.steelSectionsCarbonKg)}]
      #v(0.1em)
      #text(size: 8pt, fill: ridge-muted)[excl. connections allowance]
    ],
    [
      #align(center)[
        #box(
          fill: ridge-dark,
          inset: (x: 12pt, y: 8pt),
          radius: 4pt,
        )[
          #text(size: 20pt, weight: "bold", fill: white)[${carbon.scorsBand}]
        ]
        #v(0.2em)
        #text(size: 8pt, fill: ridge-muted)[IStructE SCORS]
      ]
    ],
  )
]

#v(0.8em)
#text(fill: ridge-muted)[
  A1–A3 estimate from element mass × factor. Includes a 250 mm ground floor slab with H12 top and bottom at 200 mm centres, plus 10% steel for connections. Use this report to compare schemes and identify the elements driving embodied carbon.
]

#pagebreak()

== Visual overview

The charts below show where carbon is concentrated across individual elements and broader material groups. Use them to compare alternative schemes and spot disproportionate contributors.

#grid(
  columns: (1fr, 1fr),
  gutter: 16pt,
  [
    #text(weight: "bold", fill: ridge-mid)[Carbon by element]
    #v(0.4em)
    #canvas({
      draw.set-style(legend: (fill: white, stroke: 0.5pt + ridge-muted))
      chart.piechart(
        (
${elementChartData}        ),
        label-key: 0,
        value-key: 1,
        radius: ${pieRadius},
        slice-style: chart-gradient,
        stroke: 0.5pt + white,
        inner-radius: ${pieInnerRadius},
        outer-label: (content: "%", radius: 110%),
      )
    })
  ],
  [
    #text(weight: "bold", fill: ridge-mid)[Carbon by material group]
    #v(0.4em)
    #canvas({
      draw.set-style(legend: (fill: white, stroke: 0.5pt + ridge-muted))
      chart.piechart(
        (
${categoryChartData}        ),
        label-key: 0,
        value-key: 1,
        radius: ${pieRadius},
        slice-style: chart-gradient,
        stroke: 0.5pt + white,
        inner-radius: ${pieInnerRadius},
        outer-label: (content: "%", radius: 110%),
      )
    })
  ],
)

#v(1.5em)

=== Total carbon by element

#canvas({
  draw.set-style(
    legend: (fill: white, stroke: 0.5pt + ridge-muted),
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

Columns, rafters, gable columns, and haunches usually dominate the primary steel takeoff. Compare their relative contributions before reviewing secondary steel, foundations, or slab scope.

#grid(
  columns: (1fr, 1fr),
  gutter: 16pt,
  [
    #text(weight: "bold", fill: ridge-mid)[Primary members — horizontal bars]
    #v(0.4em)
    #canvas({
      draw.set-style(columnchart: (bar-width: 0.7))
      chart.barchart(
        (
${primaryChartData}        ),
        size: (${chartDimension(halfChartWidth)}, 5.5),
        label-key: 0,
        value-key: 1,
        x-label: [Carbon (tCO2e)],
        y-label: none,
        bar-style: chart-bar-style,
      )
    })
  ],
  [
    #text(weight: "bold", fill: ridge-mid)[Top five contributors]
    #v(0.4em)
    #canvas({
      draw.set-style(columnchart: (bar-width: 0.7))
      chart.columnchart(
        (
${topContributorData}        ),
        size: (${chartDimension(halfChartWidth)}, 5.5),
        label-key: 0,
        value-key: 1,
        x-label: none,
        y-label: [Carbon (tCO2e)],
        bar-style: chart-bar-style,
      )
    })
  ],
)

#v(1em)
#table(
  columns: (1.2fr, auto, auto, auto),
  stroke: 0.5pt + ridge-dark,
  inset: 8pt,
  align: (left, right, right, right),
  table.header(
    [*Primary member*], [*Mass*], [*Carbon*], [*Share of total*],
  ),
${analytics.primaryFrameElements.map((element) =>
    typstTableRow([
        element.label,
        formatCarbonReportMass(element.massKg),
        formatCarbonReportCarbon(element.carbonKg),
        `${formatNumber(element.sharePercent, 1)}%`,
    ]),
).join('')}
)

#pagebreak()

== Detailed element data

This table is intended for benchmarking against other buildings. It shows mass, carbon factor, absolute carbon, share of total, cumulative share, and carbon intensity per m² of gross internal floor area for every modelled element.

#table(
  columns: (1.3fr, auto, auto, auto, auto, auto, auto),
  stroke: 0.5pt + ridge-dark,
  inset: 6pt,
  align: (left, right, right, right, right, right, right),
  table.header(
    [*Element*], [*Mass*], [*Factor*], [*Carbon*], [*Share*], [*Cumulative*], [*Per m² GIFA*],
  ),
${detailedRows})

#v(1.5em)

== Material groups

#table(
  columns: (1.6fr, auto, auto, auto),
  stroke: 0.5pt + ridge-dark,
  inset: 8pt,
  align: (left, right, right, right),
  table.header(
    [*Group*], [*Mass*], [*Carbon*], [*Share*],
  ),
${categoryRows})

#v(1.5em)

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

Ranked by absolute carbon contribution. Start with the highest lines when optimising section sizes, spacing, foundation assumptions, or slab scope.

#table(
  columns: (auto, 1.1fr, 2fr),
  stroke: 0.5pt + ridge-dark,
  inset: 8pt,
  align: (center, left, left),
  table.header(
    [*Rank*], [*Contributor*], [*What to review*],
  ),
${improvementRows})

#v(1.5em)

=== Quick observations

${analytics.topContributors
    .slice(0, 3)
    .map(
        (element, index) =>
            `- #strong[${escapeTypstContent(`${index + 1}. ${element.label}`)}] contributes ${formatNumber(element.sharePercent, 1)}% (${formatCarbonReportCarbon(element.carbonKg)}) of total carbon.`,
    )
    .join('\n')}

- #strong[Primary steel frame] accounts for ${formatNumber(analytics.categories.find((category) => category.category === 'primary_steel')?.sharePercent ?? 0, 1)}% of the total when columns, rafters, haunches, ties, and bracing are grouped together.
- #strong[Ground floor slab] accounts for ${formatNumber((analytics.categories.find((category) => category.category === 'slab')?.sharePercent ?? 0), 1)}% — confirm whether slab scope should be included when comparing against other benchmarks.
- ${nextBandNote}

#pagebreak()

== Design parameters

Record these values when comparing alternative schemes or external benchmarks.

#table(
  columns: (1.4fr, 1fr),
  stroke: 0.5pt + ridge-dark,
  inset: 8pt,
  align: (left, right),
${typstTableRow(['Span', `${formatNumber(design.span, 1)} m`])}${typstTableRow(['Building length', `${formatNumber(design.buildingLength, 1)} m`])}${typstTableRow(['Eaves height', `${formatNumber(design.eavesHeight, 1)} m`])}${typstTableRow(['Bay spacing', `${formatNumber(design.baySpacing, 1)} m`])}${typstTableRow(['Roof pitch', `${formatNumber(design.roofPitchDeg, 1)}°`])}${typstTableRow(['Dead load', `${formatNumber(design.deadLoadKnM2, 2)} kN/m²`])}${typstTableRow(['Live load', `${formatNumber(design.liveLoadKnM2, 2)} kN/m²`])}${typstTableRow(['Column restraint', design.columnRestraint === 'restrained' ? 'Restrained' : 'Unrestrained'])}${typstTableRow(['Foundation type', foundationTypeLabels[design.foundation.type]])}${typstTableRow(['Rafter section', frame.rafter.name])}${typstTableRow(['Column section', frame.column.name])}${typstTableRow(['Lookup span', `${formatNumber(frame.lookupSpanM, 0)} m`])}${typstTableRow(['Rafter line load', `${formatNumber(frame.rafterLineLoadKnM, 2)} kN/m`])}${typstTableRow(['Report date', formatReportDate(generatedAt)])}
)

#v(1.5em)

== SCORS benchmarking

#table(
  columns: (auto, 1.4fr, auto, auto),
  stroke: 0.5pt + ridge-dark,
  inset: 8pt,
  align: (center, left, center, right),
  table.header(
    [*Band*], [*Intensity range*], [*Status*], [*Headroom*],
  ),
${scorsRows})

#v(1.5em)

== Summary results

#table(
  columns: (1.4fr, 1fr),
  stroke: 0.5pt + ridge-dark,
  inset: 8pt,
  align: (left, right),
${typstTableRow(['Total embodied carbon', formatCarbonReportCarbon(carbon.totalCarbonKg)])}${typstTableRow(['Carbon intensity', `${formatNumber(carbon.carbonIntensityKgM2, 0)} kgCO2e/m²`])}${typstTableRow(['Gross internal floor area', `${formatNumber(carbon.floorAreaM2, 0)} m²`])}${typstTableRow(['IStructE SCORS band', carbon.scorsBand])}${typstTableRow(['Steel sections subtotal', formatCarbonReportCarbon(carbon.steelSectionsCarbonKg)])}
)

#v(1.5em)

== Element breakdown (compact)

#table(
  columns: (1.6fr, auto, auto, auto),
  stroke: 0.5pt + ridge-dark,
  inset: 8pt,
  align: (left, right, right, right),
  table.header(
    [*Element*], [*Mass*], [*Carbon*], [*Share*],
  ),
${breakdownRows})

#v(1.5em)

== Carbon factors

#table(
  columns: (1.6fr, auto),
  stroke: 0.5pt + ridge-dark,
  inset: 8pt,
  align: (left, right),
  table.header(
    [*Material*], [*Factor (kgCO2e/kg)*],
  ),
${typstTableRow(['Hot-rolled steel sections', formatNumber(factors.steelSection, 3)])}${typstTableRow(['Hot-dip galvanized steel', formatNumber(factors.galvanizedSteel, 3)])}${typstTableRow(['28/35 MPa concrete', formatNumber(factors.concrete, 3)])}${typstTableRow(['Steel rebar', formatNumber(factors.rebar, 3)])}
)

#v(1.5em)

== Methodology

- Hot-rolled steel sections include columns, gable columns, rafters, haunches, eaves ties, bracing, and a 10% allowance for connections.
- Side rails and purlins use the galvanized steel factor (${formatNumber(factors.galvanizedSteel, 3)} kgCO2e/kg), which is higher than hot-rolled sections (${formatNumber(factors.steelSection, 3)} kgCO2e/kg).
- Foundation concrete volume is taken from the sized footing or pile geometry; pad reinforcement is included where the model sizes a bottom mat.
- The ground floor slab is modelled as 250 mm concrete with H12 bars top and bottom each way at 200 mm centres.
- Carbon intensity is reported over gross internal floor area (span × building length).
- SCORS bands follow IStructE guidance in 50 kgCO2e/m² steps from a band-A ceiling of 150 kgCO2e/m².
- Charts plot carbon in tonnes CO2e for readability; tables retain kg or tonnes depending on magnitude.
`;
}
