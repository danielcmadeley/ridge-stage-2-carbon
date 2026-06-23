<?php

namespace App\Services\PortalFrame;

use App\Data\FrameMember;

class PortalFrameRenderAdjustments
{
    private const POSITION_TOLERANCE = 1e-6;

    /**
     * @param  list<FrameMember>  $members
     * @return list<FrameMember>
     */
    public function adjust(array $members): array
    {
        /** @var array<string, FrameMember> $columnsById */
        $columnsById = [];
        /** @var array<string, FrameMember> $raftersById */
        $raftersById = [];
        /** @var array<string, FrameMember> $trimmedRafters */
        $trimmedRafters = [];

        foreach ($members as $member) {
            if ($member->role === 'column') {
                $columnsById[$member->id] = $member;
            }

            if ($member->role === 'rafter') {
                $raftersById[$member->id] = $member;
            }
        }

        foreach ($members as $member) {
            if ($member->role !== 'rafter') {
                continue;
            }

            $column = $columnsById[$this->columnIdForRafter($member->id)] ?? null;

            if ($column === null) {
                continue;
            }

            $trimmedRafters[$member->id] = $this->trimRafterAtColumnFace($member, $column);
        }

        return array_map(function (FrameMember $member) use ($trimmedRafters, $raftersById): FrameMember {
            if ($member->role === 'rafter') {
                return $trimmedRafters[$member->id] ?? $member;
            }

            if ($member->role === 'column') {
                $rafter = $raftersById[$this->rafterIdForColumn($member->id)] ?? null;

                if ($rafter === null) {
                    return $member;
                }

                return $this->extendColumnToRafterTop($member, $rafter);
            }

            return $member;
        }, $members);
    }

    public function trimRafterAtColumnFace(FrameMember $rafter, FrameMember $column): FrameMember
    {
        $columnX = $column->start[0];
        $halfFlangeWidthM = $column->section->b / 2000;
        $innerFaceX = $columnX + ($this->inwardSign($columnX) * $halfFlangeWidthM);

        $start = $rafter->start;
        $end = $rafter->end;
        $deltaX = $end[0] - $start[0];

        if (abs($deltaX) < self::POSITION_TOLERANCE) {
            return $rafter;
        }

        $trimFraction = ($innerFaceX - $start[0]) / $deltaX;

        if ($trimFraction <= 0 || $trimFraction >= 1) {
            return $rafter;
        }

        return new FrameMember(
            id: $rafter->id,
            role: $rafter->role,
            start: [
                $start[0] + ($trimFraction * ($end[0] - $start[0])),
                $start[1] + ($trimFraction * ($end[1] - $start[1])),
                $start[2] + ($trimFraction * ($end[2] - $start[2])),
            ],
            end: $rafter->end,
            section: $rafter->section,
        );
    }

    public function extendColumnToRafterTop(FrameMember $column, FrameMember $rafter): FrameMember
    {
        $basis = MemberBasis::fromMember($rafter);
        $halfRafterDepthM = $rafter->section->h / 2000;
        $verticalExtension = $basis->majorAxis[2] * $halfRafterDepthM;

        return new FrameMember(
            id: $column->id,
            role: $column->role,
            start: $column->start,
            end: [
                $column->end[0],
                $column->end[1],
                $column->end[2] + $verticalExtension,
            ],
            section: $column->section,
        );
    }

    private function columnIdForRafter(string $rafterId): string
    {
        return str_replace('-rafter-', '-column-', $rafterId);
    }

    private function rafterIdForColumn(string $columnId): string
    {
        return str_replace('-column-', '-rafter-', $columnId);
    }

    private function inwardSign(float $columnX): float
    {
        if ($columnX === 0.0) {
            return 1.0;
        }

        return $columnX < 0 ? 1.0 : -1.0;
    }
}
