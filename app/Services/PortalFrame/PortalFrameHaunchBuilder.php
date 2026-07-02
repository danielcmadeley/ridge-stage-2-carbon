<?php

namespace App\Services\PortalFrame;

use App\Data\FrameMember;
use App\Data\UbSection;

class PortalFrameHaunchBuilder
{
    public const HAUNCH_DEPTH_FACTOR = 1.5;

    public const HAUNCH_LENGTH_FRACTION = 0.1;

    /**
     * @param  list<FrameMember>  $analysisMembers
     * @param  list<FrameMember>  $renderMembers
     * @return list<FrameMember>
     */
    public function build(array $analysisMembers, array $renderMembers, float $spanM): array
    {
        /** @var array<string, FrameMember> $analysisRafters */
        $analysisRafters = [];

        foreach ($analysisMembers as $member) {
            if ($member->role === 'rafter') {
                $analysisRafters[$member->id] = $member;
            }
        }

        $haunches = [];

        foreach ($renderMembers as $renderRafter) {
            if ($renderRafter->role !== 'rafter') {
                continue;
            }

            $analysisRafter = $analysisRafters[$renderRafter->id] ?? null;

            if ($analysisRafter === null) {
                continue;
            }

            $haunches[] = $this->buildForRafter($renderRafter, $spanM);
        }

        return $haunches;
    }

    public function buildForRafter(FrameMember $renderRafter, float $spanM): FrameMember
    {
        $basis = MemberBasis::fromMember($renderRafter);
        $rafterHalfDepthM = $renderRafter->section->h / 2000;
        $haunchLengthM = $spanM * self::HAUNCH_LENGTH_FRACTION;

        $start = MemberBasis::subtract(
            $basis->start,
            MemberBasis::scale($basis->majorAxis, $rafterHalfDepthM),
        );

        $end = MemberBasis::add(
            $start,
            MemberBasis::scale($basis->memberAxis, $haunchLengthM),
        );

        return new FrameMember(
            id: str_replace('-rafter-', '-haunch-', $renderRafter->id),
            role: 'haunch',
            start: $start,
            end: $end,
            section: $this->haunchSectionFromRafter($renderRafter->section),
        );
    }

    public function haunchSectionFromRafter(UbSection $rafterSection): UbSection
    {
        return new UbSection(
            name: $rafterSection->name,
            h: $rafterSection->h,
            b: $rafterSection->b,
            tw: $rafterSection->tw,
            tf: $rafterSection->tf,
        );
    }
}
