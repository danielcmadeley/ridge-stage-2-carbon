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
     * Gable column positions across the span (X axis), centred on the ridge.
     *
     * A column always sits at the centre (x = 0); further columns step outward
     * symmetrically on both sides. Each half-span is divided into the fewest
     * segments that keep every bay at or below `GABLE_COLUMN_SPACING_M`, so the
     * spacing is even and the column count is minimal. The two outermost
     * positions coincide with the eaves corner columns, which
     * `isExistingGableCornerColumn` later skips because the portal frame
     * already places columns there.
     *
     * @return list<float>
     */
    public function gableColumnXPositions(float $span): array
    {
        $halfSpan = $span / 2;
        $segmentsPerHalf = max(1, (int) ceil($halfSpan / self::GABLE_COLUMN_SPACING_M - 1e-9));
        $spacing = $halfSpan / $segmentsPerHalf;

        return array_map(
            fn (int $index): float => ($index - $segmentsPerHalf) * $spacing,
            range(0, $segmentsPerHalf * 2),
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
