export { buildPortalFrame, portalFrameApexHeight, portalFrameCenter } from '@/lib/portal-frame/geometry-builder';
export { extractStructuralNodes } from '@/lib/portal-frame/member-nodes';
export { createFrameMemberMesh, createPortalFrameGroup } from '@/lib/portal-frame/i-shape-geometry';
export { adjustMembersForRendering, extendColumnToRafterTop, trimRafterAtColumnFace } from '@/lib/portal-frame/render-adjustments';
export { createEavesHaunches, createEavesHaunchMesh, buildEavesHaunchMember, haunchSectionFromRafter, haunchDepthFactorAt, HAUNCH_DEPTH_FACTOR, HAUNCH_LENGTH_FRACTION } from '@/lib/portal-frame/haunch-geometry';
export { memberBasis, memberLengthM } from '@/lib/portal-frame/member-basis';
export { createStickAnalysisGroup } from '@/lib/portal-frame/stick-model';
export { analyzePortalFrame } from '@/lib/portal-frame/frame-analysis';
export type {
    FrameAnalysisResult,
    MemberAnalysisResult,
    SupportReaction,
} from '@/lib/portal-frame/frame-analysis';
export {
    createForceDiagramGroup,
    type AnalyticalForceMode,
} from '@/lib/portal-frame/force-diagram-3d';
export { lookupP399Section, snapSpanToTabulated } from '@/lib/portal-frame/p399-lookup';
export { findUbSection } from '@/lib/portal-frame/ub-sections';
