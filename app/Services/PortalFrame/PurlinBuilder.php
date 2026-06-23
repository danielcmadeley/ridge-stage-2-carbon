<?php

namespace App\Services\PortalFrame;

use App\Data\FrameMember;
use App\Data\PortalFrameDesign;
use App\Data\UbSection;
use App\Data\ZSection;

class PurlinBuilder
{
    private const PURLIN_START_OFFSET_M = 1.0;

    private const PURLIN_END_OFFSET_M = 0.25;

    private const PURLIN_SPACING_M = 1.5;

    /**
     * @return list<FrameMember>
     */
    public function build(PortalFrameDesign $design, ZSection $section, UbSection $rafterSection): array
    {
        $bayCount = max(1, (int) round($design->buildingLength / $design->baySpacing));
        $frameCount = $bayCount + 1;
        $buildingLengthEnd = ($frameCount - 1) * $design->baySpacing;
        $rafterLength = $this->rafterLengthM($design);
        $offsets = MemberSpacing::spacedOffsetsAlongSpan(
            $rafterLength,
            self::PURLIN_START_OFFSET_M,
            self::PURLIN_END_OFFSET_M,
            self::PURLIN_SPACING_M,
        );
        $members = [];

        foreach (['left', 'right'] as $side) {
            foreach ($offsets as $index => $offset) {
                ['x' => $x, 'z' => $z] = $this->purlinAnchorPoint(
                    $design,
                    $side,
                    $offset,
                    $rafterSection,
                    $section,
                );

                $members[] = new FrameMember(
                    id: "purlin-{$side}-{$index}",
                    role: 'purlin',
                    start: [$x, 0.0, $z],
                    end: [$x, $buildingLengthEnd, $z],
                    section: $section,
                    orientation: [
                        'halfSpan' => $design->span / 2,
                        'roofPitchDeg' => $design->roofPitchDeg,
                    ],
                );
            }
        }

        return $members;
    }

    public function rafterLengthM(PortalFrameDesign $design): float
    {
        $halfSpan = $design->span / 2;
        $rise = $halfSpan * tan(deg2rad($design->roofPitchDeg));

        return hypot($halfSpan, $rise);
    }

    /**
     * @return array{x: float, z: float}
     */
    public function purlinAnchorPoint(
        PortalFrameDesign $design,
        string $side,
        float $offsetAlongRafterM,
        UbSection $rafterSection,
        ZSection $purlinSection,
    ): array {
        $rafterTop = $this->pointOnRafterTopFlange(
            $design,
            $side,
            $offsetAlongRafterM,
            $rafterSection,
        );
        $purlinHalfDepthM = $purlinSection->depth / 2000;
        $normal = $this->rafterRoofNormal($side, $design->span / 2, $design->roofPitchDeg);

        return [
            'x' => $rafterTop['x'] + ($normal['x'] * $purlinHalfDepthM),
            'z' => $rafterTop['z'] + ($normal['z'] * $purlinHalfDepthM),
        ];
    }

    /**
     * @return array{x: float, z: float}
     */
    public function pointOnRafterTopFlange(
        PortalFrameDesign $design,
        string $side,
        float $offsetAlongRafterM,
        UbSection $rafterSection,
    ): array {
        $centreline = $this->pointOnRafter($design, $side, $offsetAlongRafterM);
        $halfDepthM = $rafterSection->h / 2000;
        $normal = $this->rafterRoofNormal($side, $design->span / 2, $design->roofPitchDeg);

        return [
            'x' => $centreline['x'] + ($normal['x'] * $halfDepthM),
            'z' => $centreline['z'] + ($normal['z'] * $halfDepthM),
        ];
    }

    /**
     * @return array{x: float, z: float}
     */
    public function rafterRoofNormal(string $side, float $halfSpan, float $roofPitchDeg): array
    {
        $rise = $halfSpan * tan(deg2rad($roofPitchDeg));
        $length = hypot($rise, $halfSpan);

        if ($side === 'left') {
            return ['x' => -$rise / $length, 'z' => $halfSpan / $length];
        }

        return ['x' => $rise / $length, 'z' => $halfSpan / $length];
    }

    /**
     * @return array{z: float, side: 'left'|'right'}
     */
    public function pointOnRafterAtX(PortalFrameDesign $design, float $x): array
    {
        $halfSpan = $design->span / 2;
        $rise = $halfSpan * tan(deg2rad($design->roofPitchDeg));
        $apexHeight = $design->eavesHeight + $rise;

        if ($x <= 0) {
            $fraction = ($x + $halfSpan) / $halfSpan;

            return [
                'z' => $design->eavesHeight + $fraction * ($apexHeight - $design->eavesHeight),
                'side' => 'left',
            ];
        }

        $fraction = ($halfSpan - $x) / $halfSpan;

        return [
            'z' => $design->eavesHeight + $fraction * ($apexHeight - $design->eavesHeight),
            'side' => 'right',
        ];
    }

    public function rafterUndersideZAtX(PortalFrameDesign $design, float $x, UbSection $rafterSection): float
    {
        $point = $this->pointOnRafterAtX($design, $x);
        $halfDepthM = $rafterSection->h / 2000;
        $normal = $this->rafterRoofNormal($point['side'], $design->span / 2, $design->roofPitchDeg);

        return $point['z'] - ($normal['z'] * $halfDepthM);
    }

    /**
     * @return array{x: float, z: float}
     */
    public function pointOnRafter(PortalFrameDesign $design, string $side, float $offsetAlongRafterM): array
    {
        $halfSpan = $design->span / 2;
        $rise = $halfSpan * tan(deg2rad($design->roofPitchDeg));
        $rafterLength = hypot($halfSpan, $rise);
        $fraction = $offsetAlongRafterM / $rafterLength;
        $eavesX = $side === 'left' ? -$halfSpan : $halfSpan;
        $apexHeight = $design->eavesHeight + $rise;

        return [
            'x' => $eavesX + (0.0 - $eavesX) * $fraction,
            'z' => $design->eavesHeight + ($apexHeight - $design->eavesHeight) * $fraction,
        ];
    }
}
