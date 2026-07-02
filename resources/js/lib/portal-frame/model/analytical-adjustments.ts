import { buildAnalyticalGableColumns } from '@/lib/portal-frame/model/gable-columns';
import { isUbSection } from '@/lib/portal-frame/model/member-basis';
import { buildAnalyticalPurlins } from '@/lib/portal-frame/model/purlins';
import { buildAnalyticalSideRails } from '@/lib/portal-frame/model/side-rails';
import type {
    CSectionDimensions,
    FrameMember,
    PortalFrameDesign,
    ZSectionDimensions,
} from '@/types/portal-frame';

function isZSection(
    section: FrameMember['section'],
): section is ZSectionDimensions {
    return section.profile === 'z';
}

function isCSection(
    section: FrameMember['section'],
): section is CSectionDimensions {
    return section.profile === 'c';
}

/**
 * Apply geometry adjustments for the stick analytical model only.
 * Secondary members use primary-member centrelines and are split at each frame.
 */
export function adjustMembersForAnalysis(
    members: FrameMember[],
    design: PortalFrameDesign,
): FrameMember[] {
    const purlinMember = members.find((member) => member.role === 'purlin');
    const sideRailMember = members.find(
        (member) => member.role === 'side_rail',
    );
    const gableColumnMember = members.find(
        (member) => member.role === 'gable_column',
    );

    if (
        !purlinMember ||
        !sideRailMember ||
        !gableColumnMember ||
        !isZSection(purlinMember.section) ||
        !isCSection(sideRailMember.section) ||
        !isUbSection(gableColumnMember.section)
    ) {
        return members;
    }

    const withoutAdjustedMembers = members.filter(
        (member) =>
            member.role !== 'purlin' &&
            member.role !== 'side_rail' &&
            member.role !== 'gable_column',
    );

    return [
        ...withoutAdjustedMembers,
        ...buildAnalyticalPurlins(design, purlinMember.section),
        ...buildAnalyticalSideRails(design, sideRailMember.section),
        ...buildAnalyticalGableColumns(design, gableColumnMember.section),
    ];
}
