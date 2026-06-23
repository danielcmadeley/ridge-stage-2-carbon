export { buildPortalFrame, portalFrameApexHeight, portalFrameCenter } from '@/lib/portal-frame/geometry-builder';
export { extractStructuralNodes } from '@/lib/portal-frame/member-nodes';
export { createFrameMemberMesh, createPortalFrameGroup } from '@/lib/portal-frame/i-shape-geometry';
export { adjustMembersForRendering, extendColumnToRafterTop, trimRafterAtColumnFace } from '@/lib/portal-frame/render-adjustments';
export { createEavesHaunches, createEavesHaunchMesh, buildEavesHaunchMember, haunchSectionFromRafter, haunchDepthFactorAt, HAUNCH_DEPTH_FACTOR, HAUNCH_LENGTH_FRACTION } from '@/lib/portal-frame/haunch-geometry';
export { memberBasis, memberLengthM } from '@/lib/portal-frame/member-basis';
export { createStickAnalysisGroup } from '@/lib/portal-frame/stick-model';
export { analyzePortalFrame, analyzeGoverningPortalFrame } from '@/lib/portal-frame/frame-analysis';
export type {
    FrameAnalysisOptions,
    FrameAnalysisResult,
    MemberAnalysisResult,
    SupportReaction,
} from '@/lib/portal-frame/frame-analysis';
export {
    sizeFoundation,
    sizeFoundationReactions,
    type FoundationCheck,
    type FoundationDimensions,
    type FoundationSizingResult,
} from '@/lib/portal-frame/foundation-sizing';
export {
    createForceDiagramGroup,
    type AnalyticalForceMode,
} from '@/lib/portal-frame/force-diagram-3d';
export { buildGableEndBracing, GABLE_ROOF_BRACE_RAFTER_FRACTION } from '@/lib/portal-frame/gable-bracing';
export {
    buildGableColumns,
    gableColumnXPositions,
    GABLE_COLUMN_SPACING_M,
} from '@/lib/portal-frame/gable-columns';
export { lookupP399Section, snapSpanToTabulated } from '@/lib/portal-frame/p399-lookup';
export { findChsSection } from '@/lib/portal-frame/chs-sections';
export { findUbSection } from '@/lib/portal-frame/ub-sections';
export { findZSection } from '@/lib/portal-frame/z-sections';
export { findCSection } from '@/lib/portal-frame/c-sections';
export { buildPurlins } from '@/lib/portal-frame/purlins';
export { buildSideRails } from '@/lib/portal-frame/side-rails';
export { spacedOffsetsAlongSpan } from '@/lib/portal-frame/member-spacing';
export {
    createGroundFloorSlabMesh,
    groundFloorSlab,
    GROUND_FLOOR_SLAB_DEPTH_M,
    GROUND_FLOOR_SLAB_REBAR_DIAMETER_MM,
    GROUND_FLOOR_SLAB_REBAR_SPACING_M,
    type GroundFloorSlab,
} from '@/lib/portal-frame/ground-floor-slab';
export { carbonFactors, type CarbonFactors } from '@/lib/portal-frame/carbon-factors';
export {
    calculatePortalFrameCarbon,
    HAUNCH_TAPER_MASS_FACTOR,
    STEEL_DENSITY_KG_M3,
    type CarbonQuantity,
    type PortalFrameCarbon,
    type PortalFrameCarbonBreakdown,
} from '@/lib/portal-frame/carbon';
export {
    scorsBandForIntensity,
    scorsBandDefinition,
    SCORS_BANDS,
    type ScorsBand,
    type ScorsBandDefinition,
} from '@/lib/portal-frame/scors';
