<?php

namespace App\Services\PortalFrame;

use App\Data\CSection;
use App\Data\FrameMember;
use App\Data\PortalFrameDesign;
use App\Data\UbSection;

class SideRailBuilder
{
    private const SIDE_RAIL_START_OFFSET_M = 1.0;

    private const SIDE_RAIL_SPACING_M = 1.5;

    /**
     * @return list<FrameMember>
     */
    public function build(
        PortalFrameDesign $design,
        CSection $section,
        UbSection $columnSection,
        UbSection $gableColumnSection,
    ): array {
        $bayCount = max(1, (int) round($design->buildingLength / $design->baySpacing));
        $frameCount = $bayCount + 1;
        $buildingLengthEnd = ($frameCount - 1) * $design->baySpacing;
        $halfSpan = $design->span / 2;
        $heights = MemberSpacing::spacedOffsetsAlongSpan(
            $design->eavesHeight,
            self::SIDE_RAIL_START_OFFSET_M,
            0.0,
            self::SIDE_RAIL_SPACING_M,
        );
        $frontGableAnchorY = $this->sideRailGableAnchorY(0.0, $gableColumnSection, $section, 'front');
        $rearGableAnchorY = $this->sideRailGableAnchorY(
            $buildingLengthEnd,
            $gableColumnSection,
            $section,
            'rear',
        );
        $members = [];

        foreach (['left', 'right'] as $side) {
            $x = $this->sideRailAnchorX($halfSpan, $columnSection, $section, $side);

            foreach ($heights as $index => $height) {
                $members[] = new FrameMember(
                    id: "side-rail-{$side}-{$index}",
                    role: 'side_rail',
                    start: [$x, $frontGableAnchorY, $height],
                    end: [$x, $rearGableAnchorY, $height],
                    section: $section,
                );
            }
        }

        $leftAnchorX = $this->sideRailAnchorX($halfSpan, $columnSection, $section, 'left');
        $rightAnchorX = $this->sideRailAnchorX($halfSpan, $columnSection, $section, 'right');

        foreach ([['front', $frontGableAnchorY], ['rear', $rearGableAnchorY]] as [$gableLabel, $y]) {
            foreach ($heights as $index => $height) {
                $members[] = new FrameMember(
                    id: "side-rail-gable-{$gableLabel}-{$index}",
                    role: 'side_rail',
                    start: [$leftAnchorX, $y, $height],
                    end: [$rightAnchorX, $y, $height],
                    section: $section,
                );
            }
        }

        return $members;
    }

    public function outerColumnFlangeX(float $halfSpan, UbSection $columnSection, string $side): float
    {
        $halfFlangeWidthM = $columnSection->b / 2000;

        return $side === 'left'
            ? -$halfSpan - $halfFlangeWidthM
            : $halfSpan + $halfFlangeWidthM;
    }

    public function sideRailAnchorX(
        float $halfSpan,
        UbSection $columnSection,
        CSection $sideRailSection,
        string $side,
    ): float {
        $outerFlangeX = $this->outerColumnFlangeX($halfSpan, $columnSection, $side);
        $sideRailDepthM = $sideRailSection->depth / 1000;

        return $side === 'left'
            ? $outerFlangeX - $sideRailDepthM
            : $outerFlangeX + $sideRailDepthM;
    }

    public function outerGableColumnFlangeY(
        float $gableColumnY,
        UbSection $gableColumnSection,
        string $gable,
    ): float {
        $halfFlangeWidthM = $gableColumnSection->b / 2000;

        return $gable === 'front'
            ? $gableColumnY - $halfFlangeWidthM
            : $gableColumnY + $halfFlangeWidthM;
    }

    public function sideRailGableAnchorY(
        float $gableColumnY,
        UbSection $gableColumnSection,
        CSection $sideRailSection,
        string $gable,
    ): float {
        $outerFlangeY = $this->outerGableColumnFlangeY($gableColumnY, $gableColumnSection, $gable);
        $sideRailDepthM = $sideRailSection->depth / 1000;

        return $gable === 'front'
            ? $outerFlangeY - $sideRailDepthM
            : $outerFlangeY + $sideRailDepthM;
    }
}
