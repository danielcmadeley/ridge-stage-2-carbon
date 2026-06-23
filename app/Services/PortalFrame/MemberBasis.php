<?php

namespace App\Services\PortalFrame;

use App\Data\FrameMember;

readonly class MemberBasis
{
    /**
     * @param  array{0: float, 1: float, 2: float}  $start
     * @param  array{0: float, 1: float, 2: float}  $end
     * @param  array{0: float, 1: float, 2: float}  $memberAxis
     * @param  array{0: float, 1: float, 2: float}  $majorAxis
     * @param  array{0: float, 1: float, 2: float}  $minorAxis
     */
    public function __construct(
        public array $start,
        public array $end,
        public array $memberAxis,
        public array $majorAxis,
        public array $minorAxis,
        public float $lengthM,
    ) {}

    public static function fromMember(FrameMember $member): self
    {
        $start = $member->start;
        $end = $member->end;
        $direction = self::subtract($end, $start);
        $lengthM = self::length($direction);

        if ($lengthM === 0.0) {
            return new self(
                start: $start,
                end: $end,
                memberAxis: [0.0, 0.0, 1.0],
                majorAxis: [1.0, 0.0, 0.0],
                minorAxis: [0.0, 1.0, 0.0],
                lengthM: 0.0,
            );
        }

        $memberAxis = self::normalize($direction);

        if ($member->role === 'column') {
            $majorAxis = [-$start[0], 0.0, 0.0];

            if (self::length($majorAxis) < 1e-9) {
                $majorAxis = [1.0, 0.0, 0.0];
            } else {
                $majorAxis = self::normalize($majorAxis);
            }
        } elseif ($member->role === 'gable_column') {
            $majorAxis = $start[1] < 1e-6 ? [0.0, 1.0, 0.0] : [0.0, -1.0, 0.0];
        } elseif ($member->role === 'purlin' && $member->orientation !== null) {
            $halfSpan = $member->orientation['halfSpan'];
            $rise = $halfSpan * tan(deg2rad($member->orientation['roofPitchDeg']));
            $side = $start[0] < 0 ? 'left' : 'right';

            if ($side === 'left') {
                $majorAxis = [-$rise, 0.0, $halfSpan];
            } else {
                $majorAxis = [$rise, 0.0, $halfSpan];
            }

            $majorAxis = self::normalize($majorAxis);
        } elseif ($member->role === 'side_rail') {
            $deltaX = abs($end[0] - $start[0]);
            $deltaY = abs($end[1] - $start[1]);

            if ($deltaX > $deltaY) {
                $majorAxis = $start[1] < 1e-6 ? [0.0, 1.0, 0.0] : [0.0, -1.0, 0.0];
            } else {
                $majorAxis = [$start[0] < 0 ? 1.0 : -1.0, 0.0, 0.0];
            }
        } elseif ($member->role === 'rafter' || $member->role === 'haunch' || $member->role === 'tie' || $member->role === 'brace') {
            $majorAxis = self::normalize(self::cross($memberAxis, [0.0, 1.0, 0.0]));

            if ($majorAxis[2] < 0) {
                $majorAxis = self::scale($majorAxis, -1.0);
            }
        } else {
            $majorAxis = [1.0, 0.0, 0.0];
        }

        $minorAxis = self::normalize(self::cross($memberAxis, $majorAxis));

        return new self(
            start: $start,
            end: $end,
            memberAxis: $memberAxis,
            majorAxis: $majorAxis,
            minorAxis: $minorAxis,
            lengthM: $lengthM,
        );
    }

    /**
     * @param  array{0: float, 1: float, 2: float}  $vector
     * @return array{0: float, 1: float, 2: float}
     */
    public static function normalize(array $vector): array
    {
        $length = self::length($vector);

        if ($length === 0.0) {
            return [0.0, 0.0, 0.0];
        }

        return self::scale($vector, 1.0 / $length);
    }

    /**
     * @param  array{0: float, 1: float, 2: float}  $left
     * @param  array{0: float, 1: float, 2: float}  $right
     * @return array{0: float, 1: float, 2: float}
     */
    public static function cross(array $left, array $right): array
    {
        return [
            ($left[1] * $right[2]) - ($left[2] * $right[1]),
            ($left[2] * $right[0]) - ($left[0] * $right[2]),
            ($left[0] * $right[1]) - ($left[1] * $right[0]),
        ];
    }

    /**
     * @param  array{0: float, 1: float, 2: float}  $left
     * @param  array{0: float, 1: float, 2: float}  $right
     * @return array{0: float, 1: float, 2: float}
     */
    public static function subtract(array $left, array $right): array
    {
        return [
            $left[0] - $right[0],
            $left[1] - $right[1],
            $left[2] - $right[2],
        ];
    }

    /**
     * @param  array{0: float, 1: float, 2: float}  $vector
     */
    public static function length(array $vector): float
    {
        return sqrt(
            ($vector[0] ** 2) + ($vector[1] ** 2) + ($vector[2] ** 2),
        );
    }

    /**
     * @param  array{0: float, 1: float, 2: float}  $vector
     * @return array{0: float, 1: float, 2: float}
     */
    public static function scale(array $vector, float $factor): array
    {
        return [
            $vector[0] * $factor,
            $vector[1] * $factor,
            $vector[2] * $factor,
        ];
    }

    /**
     * @param  array{0: float, 1: float, 2: float}  $left
     * @param  array{0: float, 1: float, 2: float}  $right
     */
    public static function dot(array $left, array $right): float
    {
        return ($left[0] * $right[0]) + ($left[1] * $right[1]) + ($left[2] * $right[2]);
    }

    /**
     * @param  array{0: float, 1: float, 2: float}  $left
     * @param  array{0: float, 1: float, 2: float}  $right
     * @return array{0: float, 1: float, 2: float}
     */
    public static function add(array $left, array $right): array
    {
        return [
            $left[0] + $right[0],
            $left[1] + $right[1],
            $left[2] + $right[2],
        ];
    }
}
