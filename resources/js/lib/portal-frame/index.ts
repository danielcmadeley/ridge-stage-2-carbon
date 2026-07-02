export {
    buildPortalFrame,
    portalFrameApexHeight,
    portalFrameCenter,
} from '@/lib/portal-frame/model/geometry-builder';
export {
    createSiteGroundGroup,
    createSitePropsGroup,
    createSiteSceneryGroup,
    replaceSiteGroundGroup,
    replaceSitePropsGroup,
    replaceSiteSceneryGroup,
    type SiteSceneryMetrics,
} from '@/lib/portal-frame/rendering/site-scenery';
export { extractStructuralNodes } from '@/lib/portal-frame/model/member-nodes';
export {
    createFrameMemberMesh,
    createPortalFrameGroup,
} from '@/lib/portal-frame/rendering/geometries/i-shape-geometry';
export {
    adjustMembersForRendering,
    extendColumnToRafterTop,
    trimRafterAtColumnFace,
} from '@/lib/portal-frame/model/render-adjustments';
export {
    createEavesHaunches,
    createEavesHaunchMesh,
    buildEavesHaunchMember,
    haunchSectionFromRafter,
    haunchDepthFactorAt,
    HAUNCH_DEPTH_FACTOR,
    HAUNCH_LENGTH_FRACTION,
} from '@/lib/portal-frame/model/haunch-geometry';
export {
    memberBasis,
    memberLengthM,
} from '@/lib/portal-frame/model/member-basis';
export { createStickAnalysisGroup } from '@/lib/portal-frame/rendering/stick-model';
export {
    analyzePortalFrame,
    analyzeGoverningPortalFrame,
} from '@/lib/portal-frame/analysis/frame-analysis';
export type {
    AnalyticalLoadCase,
    FrameAnalysisOptions,
    FrameAnalysisResult,
    MemberAnalysisResult,
    SupportReaction,
} from '@/lib/portal-frame/analysis/frame-analysis';
export {
    sizeFoundation,
    sizeFoundationReactions,
    type FoundationCheck,
    type FoundationDimensions,
    type FoundationSizingResult,
} from '@/lib/portal-frame/foundation/foundation-sizing';
export {
    FOUNDATION_REFERENCE_WIND_PRESSURE_KN_M2,
    foundationWindLoadKn,
} from '@/lib/portal-frame/foundation/foundation-wind-load';
export {
    createForceDiagramGroup,
    type AnalyticalForceMode,
} from '@/lib/portal-frame/analysis/force-diagram-3d';
export {
    buildGableEndBracing,
    GABLE_ROOF_BRACE_RAFTER_FRACTION,
} from '@/lib/portal-frame/model/gable-bracing';
export {
    buildGableColumns,
    gableColumnXPositions,
    GABLE_COLUMN_SPACING_M,
} from '@/lib/portal-frame/model/gable-columns';
export {
    lookupP399Section,
    snapSpanToTabulated,
} from '@/lib/portal-frame/sections/p399-lookup';
export { findChsSection } from '@/lib/portal-frame/sections/chs-sections';
export { findUbSection } from '@/lib/portal-frame/sections/ub-sections';
export { findZSection } from '@/lib/portal-frame/sections/z-sections';
export { findCSection } from '@/lib/portal-frame/sections/c-sections';
export { buildPurlins } from '@/lib/portal-frame/model/purlins';
export { buildSideRails } from '@/lib/portal-frame/model/side-rails';
export { spacedOffsetsAlongSpan } from '@/lib/portal-frame/model/member-spacing';
export {
    createGroundFloorSlabMesh,
    groundFloorSlab,
    GROUND_FLOOR_SLAB_DEPTH_M,
    GROUND_FLOOR_SLAB_REBAR_DIAMETER_MM,
    GROUND_FLOOR_SLAB_REBAR_SPACING_M,
    type GroundFloorSlab,
} from '@/lib/portal-frame/model/ground-floor-slab';
export {
    carbonFactors,
    type CarbonFactors,
} from '@/lib/portal-frame/carbon/carbon-factors';
export {
    calculatePortalFrameCarbon,
    HAUNCH_TAPER_MASS_FACTOR,
    STEEL_DENSITY_KG_M3,
    type CarbonQuantity,
    type PortalFrameCarbon,
    type PortalFrameCarbonBreakdown,
} from '@/lib/portal-frame/carbon/carbon';
export {
    scorsBandForIntensity,
    scorsBandDefinition,
    SCORS_BANDS,
    type ScorsBand,
    type ScorsBandDefinition,
} from '@/lib/portal-frame/carbon/scors';
