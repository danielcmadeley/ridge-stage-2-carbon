import { analyzeGoverningPortalFrame } from '@/lib/portal-frame/analysis/frame-analysis';
import type {
    FoundationDimensions,
    FoundationSizingResult,
} from '@/lib/portal-frame/foundation/foundation-sizing';
import { sizeFoundationReactions } from '@/lib/portal-frame/foundation/foundation-sizing';
import { buildGableEndBracing } from '@/lib/portal-frame/model/gable-bracing';
import { buildGableColumns } from '@/lib/portal-frame/model/gable-columns';
import { buildPurlins } from '@/lib/portal-frame/model/purlins';
import { buildSideRails } from '@/lib/portal-frame/model/side-rails';
import { findCSection } from '@/lib/portal-frame/sections/c-sections';
import { findChsSection } from '@/lib/portal-frame/sections/chs-sections';
import {
    lookupP399Section,
    snapSpanToTabulated,
} from '@/lib/portal-frame/sections/p399-lookup';
import { findUbSection } from '@/lib/portal-frame/sections/ub-sections';
import { findZSection } from '@/lib/portal-frame/sections/z-sections';
import type {
    ChsSectionDimensions,
    CSectionDimensions,
    FrameMember,
    PortalFrameDesign,
    ResolvedPortalFrameSections,
    UbSectionDimensions,
    ZSectionDimensions,
} from '@/types/portal-frame';
import {
    factoredRafterLineLoadKnM,
    rafterLineLoadKnM,
} from '@/types/portal-frame';

const FOOTING_WIDTH_M = 1.5;
const FOOTING_DEPTH_M = 1.5;
const FOOTING_HEIGHT_M = 0.5;
const TIE_SECTION_DESIGNATION = 'UB 203x133x25';
const BRACE_SECTION_DESIGNATION = '114.3x5.0 CHS';
const PURLIN_SECTION_DESIGNATION = '202 Z 16';
const SIDE_RAIL_SECTION_DESIGNATION = '202 C 16';
const GABLE_COLUMN_SECTION_DESIGNATION = 'UB 203x133x25';

export type BuiltPortalFrame = ResolvedPortalFrameSections & {
    members: FrameMember[];
};

type FoundationDimensionsBySide = {
    left: FoundationDimensions;
    right: FoundationDimensions;
};

type FoundationSizingBySide = {
    left: FoundationSizingResult;
    right: FoundationSizingResult;
};

const DEFAULT_FOUNDATION_DIMENSIONS: FoundationDimensions = {
    widthM: FOOTING_WIDTH_M,
    depthM: FOOTING_DEPTH_M,
    heightM: FOOTING_HEIGHT_M,
};

export function buildPortalFrame(design: PortalFrameDesign): BuiltPortalFrame {
    if (design.baySpacing <= 0) {
        throw new Error('Bay spacing must be greater than zero.');
    }

    // Section lookup uses the ULS FACTORED line load (γ_G·(dead+services) +
    // γ_Q·live), so the chosen sections resist factored actions per the user's
    // "all loading factored" intent. Foundation analysis below still runs on the
    // characteristic line load (via analyzeGoverningPortalFrame) because the
    // foundation sizers apply their own EC7 partial factors internally.
    const lineLoad = factoredRafterLineLoadKnM(design);
    const characteristicLineLoad = rafterLineLoadKnM(design);
    const lookupSpanM = snapSpanToTabulated(design.span);

    const rafterDesignation = lookupP399Section(
        'Rafter',
        lineLoad,
        design.eavesHeight,
        design.span,
    );

    const columnMemberType =
        design.columnRestraint === 'unrestrained'
            ? 'Unrestrained Column'
            : 'Restrained Column';

    const columnDesignation = lookupP399Section(
        columnMemberType,
        lineLoad,
        design.eavesHeight,
        design.span,
    );

    const rafter = findUbSection(rafterDesignation);
    const column = findUbSection(columnDesignation);
    const tie = findUbSection(TIE_SECTION_DESIGNATION);
    const brace = findChsSection(BRACE_SECTION_DESIGNATION);
    const purlin = findZSection(PURLIN_SECTION_DESIGNATION);
    const sideRail = findCSection(SIDE_RAIL_SECTION_DESIGNATION);
    const gableColumn = findUbSection(GABLE_COLUMN_SECTION_DESIGNATION);
    const provisionalMembers = buildMembers(
        design,
        rafter,
        column,
        tie,
        brace,
        purlin,
        sideRail,
        gableColumn,
        {
            left: DEFAULT_FOUNDATION_DIMENSIONS,
            right: DEFAULT_FOUNDATION_DIMENSIONS,
        },
    );
    const provisionalFrame: BuiltPortalFrame = {
        rafterLineLoadKnM: characteristicLineLoad,
        lookupSpanM,
        rafter,
        column,
        members: provisionalMembers,
    };
    let foundationSizing: FoundationSizingBySide | null = null;

    try {
        const sizing = sizeFoundationReactions(
            analyzeGoverningPortalFrame(provisionalFrame, design).reactions,
            design,
            column,
        );
        foundationSizing = sizing;
    } catch {
        foundationSizing = null;
    }

    const foundationDimensions: FoundationDimensionsBySide = foundationSizing
        ? {
              left: foundationSizing.left.dimensions,
              right: foundationSizing.right.dimensions,
          }
        : {
              left: DEFAULT_FOUNDATION_DIMENSIONS,
              right: DEFAULT_FOUNDATION_DIMENSIONS,
          };

    return {
        rafterLineLoadKnM: characteristicLineLoad,
        lookupSpanM,
        rafter,
        column,
        members: buildMembers(
            design,
            rafter,
            column,
            tie,
            brace,
            purlin,
            sideRail,
            gableColumn,
            foundationDimensions,
            foundationSizing,
        ),
    };
}

function buildMembers(
    design: PortalFrameDesign,
    rafterSection: UbSectionDimensions,
    columnSection: UbSectionDimensions,
    tieSection: UbSectionDimensions,
    braceSection: ChsSectionDimensions,
    purlinSection: ZSectionDimensions,
    sideRailSection: CSectionDimensions,
    gableColumnSection: UbSectionDimensions,
    foundationDimensions: FoundationDimensionsBySide,
    foundationSizing: FoundationSizingBySide | null = null,
): FrameMember[] {
    const members: FrameMember[] = [];
    // A building length spanning N bays has N + 1 frames (one at each bay
    // boundary), e.g. 10 m at 5 m spacing -> 2 bays -> 3 frames at y = 0, 5, 10.
    const bayCount = Math.max(
        1,
        Math.round(design.buildingLength / design.baySpacing),
    );
    const frameCount = bayCount + 1;
    const halfSpan = design.span / 2;
    const pitchRadians = (design.roofPitchDeg * Math.PI) / 180;
    const apexHeight = design.eavesHeight + halfSpan * Math.tan(pitchRadians);
    const footingSection: UbSectionDimensions = {
        profile: 'ub',
        name: 'Footing',
        h: FOOTING_HEIGHT_M * 1000,
        b: FOOTING_WIDTH_M * 1000,
        tw: FOOTING_DEPTH_M * 1000,
        tf: 0,
        areaCm2: FOOTING_WIDTH_M * FOOTING_DEPTH_M * 10000,
        iyCm4: 1,
        massPerMKg: 0,
    };

    for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
        const y = frameIndex * design.baySpacing;

        for (const side of [-1, 1] as const) {
            const x = side * halfSpan;
            const sideLabel = side < 0 ? 'left' : 'right';
            const footing =
                side < 0
                    ? foundationDimensions.left
                    : foundationDimensions.right;
            const foundationResult =
                side < 0 ? foundationSizing?.left : foundationSizing?.right;

            members.push({
                id: `frame-${frameIndex}-column-${sideLabel}`,
                role: 'column',
                start: [x, y, 0],
                end: [x, y, design.eavesHeight],
                section: columnSection,
            });

            members.push({
                id: `frame-${frameIndex}-rafter-${sideLabel}`,
                role: 'rafter',
                start: [x, y, design.eavesHeight],
                end: [0, y, apexHeight],
                section: rafterSection,
            });

            members.push({
                id: `frame-${frameIndex}-footing-${sideLabel}`,
                role: 'foundation',
                start: [x, y, -footing.heightM],
                end: [x, y, 0],
                section: footingSection,
                footing: {
                    width: footing.widthM,
                    depth: footing.depthM,
                    height: footing.heightM,
                },
            });

            if (foundationResult?.pileCap) {
                const pileSpacingM = foundationResult.pileCap.pileSpacingM;

                for (const pileIndex of [-1, 1] as const) {
                    const pileX = x + (pileIndex * pileSpacingM) / 2;
                    const pileLabel = pileIndex < 0 ? 'a' : 'b';

                    members.push({
                        id: `frame-${frameIndex}-pile-${sideLabel}-${pileLabel}`,
                        role: 'foundation',
                        start: [pileX, y, -footing.heightM],
                        end: [
                            pileX,
                            y,
                            -footing.heightM -
                                foundationResult.pileCap.pileDepthM,
                        ],
                        section: footingSection,
                        pile: {
                            diameter: foundationResult.pileCap.pileDiameterM,
                            depth: foundationResult.pileCap.pileDepthM,
                        },
                    });
                }
            }
        }
    }

    for (const side of [-1, 1] as const) {
        const x = side * halfSpan;
        const sideLabel = side < 0 ? 'left' : 'right';

        members.push({
            id: `eaves-tie-${sideLabel}`,
            role: 'tie',
            start: [x, 0, design.eavesHeight],
            end: [x, (frameCount - 1) * design.baySpacing, design.eavesHeight],
            section: tieSection,
        });
    }

    members.push(
        ...buildGableEndBracing(
            frameCount,
            design.baySpacing,
            halfSpan,
            design.eavesHeight,
            apexHeight,
            braceSection,
        ),
    );

    members.push(...buildPurlins(design, purlinSection, rafterSection));
    members.push(
        ...buildGableColumns(design, gableColumnSection, rafterSection),
    );
    members.push(
        ...buildSideRails(
            design,
            sideRailSection,
            columnSection,
            gableColumnSection,
        ),
    );

    return members;
}

export function portalFrameApexHeight(design: PortalFrameDesign): number {
    const pitchRadians = (design.roofPitchDeg * Math.PI) / 180;

    return design.eavesHeight + (design.span / 2) * Math.tan(pitchRadians);
}

export function portalFrameCenter(
    design: PortalFrameDesign,
): [number, number, number] {
    return [0, design.buildingLength / 2, portalFrameApexHeight(design) / 2];
}
