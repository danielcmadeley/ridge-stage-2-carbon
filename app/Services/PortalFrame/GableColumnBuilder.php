<?php

namespace App\Services\PortalFrame;

use App\Data\FrameMember;
use App\Data\PortalFrameDesign;
use App\Data\UbSection;

class GableColumnBuilder
{
    public const GABLE_COLUMN_SPACING_M = 6.0;

    private const FOOTING_WIDTH_M = 1.5;

    private const FOOTING_DEPTH_M = 1.5;

    private const FOOTING_HEIGHT_M = 0.5;

    public function __construct(
        private readonly PurlinBuilder $purlinBuilder,
    ) {}

    /**
     * @return list<float>
     */
    public function gableColumnXPositions(float $span): array
    {
        $halfSpan = $span / 2;

        return array_map(
            fn (float $offset): float => -$halfSpan + $offset,
            MemberSpacing::spacedOffsetsAlongSpan($span, 0.0, 0.0, self::GABLE_COLUMN_SPACING_M),
        );
    }

    public function isExistingGableCornerColumn(
        float $x,
        float $y,
        float $halfSpan,
        float $buildingLengthEnd,
    ): bool {
        if (abs(abs($x) - $halfSpan) > 1e-9) {
            return false;
        }

        return abs($y) < 1e-9 || abs($y - $buildingLengthEnd) < 1e-9;
    }

    /**
     * @return list<FrameMember>
     */
    public function build(
        PortalFrameDesign $design,
        UbSection $gableColumnSection,
        UbSection $rafterSection,
    ): array {
        $bayCount = max(1, (int) round($design->buildingLength / $design->baySpacing));
        $frameCount = $bayCount + 1;
        $buildingLengthEnd = ($frameCount - 1) * $design->baySpacing;
        $halfSpan = $design->span / 2;
        $xPositions = $this->gableColumnXPositions($design->span);
        $footingSection = new UbSection(
            name: 'Footing',
            h: self::FOOTING_HEIGHT_M * 1000,
            b: self::FOOTING_WIDTH_M * 1000,
            tw: self::FOOTING_DEPTH_M * 1000,
            tf: 0,
        );
        $members = [];

        foreach ([['front', 0.0], ['rear', $buildingLengthEnd]] as [$gableLabel, $y]) {
            foreach ($xPositions as $index => $x) {
                if ($this->isExistingGableCornerColumn($x, $y, $halfSpan, $buildingLengthEnd)) {
                    continue;
                }

                $topZ = $this->purlinBuilder->rafterUndersideZAtX($design, $x, $rafterSection);

                $members[] = new FrameMember(
                    id: "gable-{$gableLabel}-column-{$index}",
                    role: 'gable_column',
                    start: [$x, $y, 0.0],
                    end: [$x, $y, $topZ],
                    section: $gableColumnSection,
                );

                $members[] = new FrameMember(
                    id: "gable-{$gableLabel}-footing-{$index}",
                    role: 'foundation',
                    start: [$x, $y, -self::FOOTING_HEIGHT_M],
                    end: [$x, $y, 0.0],
                    section: $footingSection,
                    footing: [
                        'width' => self::FOOTING_WIDTH_M,
                        'depth' => self::FOOTING_DEPTH_M,
                        'height' => self::FOOTING_HEIGHT_M,
                    ],
                );
            }
        }

        return $members;
    }
}
