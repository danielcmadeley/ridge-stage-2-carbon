<?php

namespace App\Services\PortalFrame;

use App\Data\FrameMember;
use App\Data\PortalFrameDesign;
use App\Data\UbSection;
use InvalidArgumentException;

class PortalFrameGeometryBuilder
{
    private const FOOTING_WIDTH_M = 1.5;

    private const FOOTING_DEPTH_M = 1.5;

    private const FOOTING_HEIGHT_M = 0.5;

    private const TWO_PILE_CAP_PILE_DIAMETER_M = 0.45;

    private const TWO_PILE_CAP_PILE_DEPTH_M = 6.0;

    private const TWO_PILE_CAP_PILE_SPACING_FACTOR = 3.0;

    private const TIE_SECTION_DESIGNATION = 'UB 203x133x25';

    private const PURLIN_SECTION_DESIGNATION = '202 Z 16';

    private const SIDE_RAIL_SECTION_DESIGNATION = '202 C 16';

    private const GABLE_COLUMN_SECTION_DESIGNATION = 'UB 203x133x25';

    public function __construct(
        private readonly P399SectionLookup $p399Lookup,
        private readonly UbSectionCatalog $ubCatalog,
        private readonly ZSectionCatalog $zCatalog,
        private readonly CSectionCatalog $cCatalog,
        private readonly GableBracingBuilder $gableBracingBuilder,
        private readonly PurlinBuilder $purlinBuilder,
        private readonly GableColumnBuilder $gableColumnBuilder,
        private readonly SideRailBuilder $sideRailBuilder,
    ) {}

    /**
     * @return array{
     *     rafterLineLoadKnM: float,
     *     lookupSpanM: int,
     *     rafter: UbSection,
     *     column: UbSection,
     *     members: list<FrameMember>
     * }
     */
    public function build(PortalFrameDesign $design): array
    {
        if ($design->baySpacing <= 0) {
            throw new InvalidArgumentException('Bay spacing must be greater than zero.');
        }

        // Section lookup uses the ULS FACTORED line load (γ_G·(dead+services) + γ_Q·live),
        // so the chosen sections resist factored actions. The returned
        // rafterLineLoadKnM stays characteristic (used downstream as the
        // analysis default).
        $factoredLineLoad = $design->factoredRafterLineLoadKnM();
        $characteristicLineLoad = $design->rafterLineLoadKnM();
        $lookupSpan = $this->p399Lookup->snapSpan($design->span);

        $rafterDesignation = $this->p399Lookup->lookup(
            'Rafter',
            $factoredLineLoad,
            $design->eavesHeight,
            $design->span,
        );

        $columnMemberType = $design->columnRestraint === 'unrestrained'
            ? 'Unrestrained Column'
            : 'Restrained Column';

        $columnDesignation = $this->p399Lookup->lookup(
            $columnMemberType,
            $factoredLineLoad,
            $design->eavesHeight,
            $design->span,
        );

        $rafterSection = $this->ubCatalog->find($rafterDesignation);
        $columnSection = $this->ubCatalog->find($columnDesignation);
        $tieSection = $this->ubCatalog->find(self::TIE_SECTION_DESIGNATION);
        $purlinSection = $this->zCatalog->find(self::PURLIN_SECTION_DESIGNATION);
        $sideRailSection = $this->cCatalog->find(self::SIDE_RAIL_SECTION_DESIGNATION);
        $gableColumnSection = $this->ubCatalog->find(self::GABLE_COLUMN_SECTION_DESIGNATION);

        $members = $this->buildMembers($design, $rafterSection, $columnSection, $tieSection);
        $members = [
            ...$members,
            ...$this->gableBracingBuilder->build(
                $this->frameCount($design),
                $design->baySpacing,
                $design->span / 2,
                $design->eavesHeight,
                $design->eavesHeight + (($design->span / 2) * tan(deg2rad($design->roofPitchDeg))),
            ),
            ...$this->purlinBuilder->build($design, $purlinSection, $rafterSection),
            ...$this->gableColumnBuilder->build($design, $gableColumnSection, $rafterSection),
            ...$this->sideRailBuilder->build($design, $sideRailSection, $columnSection, $gableColumnSection),
        ];

        return [
            'rafterLineLoadKnM' => $characteristicLineLoad,
            'lookupSpanM' => $lookupSpan,
            'rafter' => $rafterSection,
            'column' => $columnSection,
            'members' => $members,
        ];
    }

    /**
     * @return list<FrameMember>
     */
    private function buildMembers(
        PortalFrameDesign $design,
        UbSection $rafterSection,
        UbSection $columnSection,
        UbSection $tieSection,
    ): array {
        $members = [];
        // A building length spanning N bays has N + 1 frames (one at each bay
        // boundary), e.g. 10 m at 5 m spacing -> 2 bays -> 3 frames at y = 0, 5, 10.
        $bayCount = max(1, (int) round($design->buildingLength / $design->baySpacing));
        $frameCount = $bayCount + 1;
        $halfSpan = $design->span / 2;
        $pitchRadians = deg2rad($design->roofPitchDeg);
        $apexHeight = $design->eavesHeight + ($halfSpan * tan($pitchRadians));
        $foundationDimensions = $this->foundationDimensions($design);
        $footingSection = new UbSection(
            name: 'Footing',
            h: $foundationDimensions['height'] * 1000,
            b: $foundationDimensions['width'] * 1000,
            tw: $foundationDimensions['depth'] * 1000,
            tf: 0,
        );

        for ($frameIndex = 0; $frameIndex < $frameCount; $frameIndex++) {
            $y = $frameIndex * $design->baySpacing;

            foreach ([-1, 1] as $side) {
                $x = $side * $halfSpan;
                $sideLabel = $side < 0 ? 'left' : 'right';

                $members[] = new FrameMember(
                    id: "frame-{$frameIndex}-column-{$sideLabel}",
                    role: 'column',
                    start: [$x, $y, 0.0],
                    end: [$x, $y, $design->eavesHeight],
                    section: $columnSection,
                );

                $members[] = new FrameMember(
                    id: "frame-{$frameIndex}-rafter-{$sideLabel}",
                    role: 'rafter',
                    start: [$x, $y, $design->eavesHeight],
                    end: [0.0, $y, $apexHeight],
                    section: $rafterSection,
                );

                $members[] = new FrameMember(
                    id: "frame-{$frameIndex}-footing-{$sideLabel}",
                    role: 'foundation',
                    start: [$x, $y, -$foundationDimensions['height']],
                    end: [$x, $y, 0.0],
                    section: $footingSection,
                    footing: [
                        'width' => $foundationDimensions['width'],
                        'depth' => $foundationDimensions['depth'],
                        'height' => $foundationDimensions['height'],
                        'type' => $foundationDimensions['type'],
                    ],
                );

                if ($design->foundationType === 'two_pile_cap') {
                    $pileSpacing = self::TWO_PILE_CAP_PILE_DIAMETER_M * self::TWO_PILE_CAP_PILE_SPACING_FACTOR;

                    foreach ([-1, 1] as $pileIndex) {
                        $pileX = $x + (($pileIndex * $pileSpacing) / 2);
                        $pileLabel = $pileIndex < 0 ? 'a' : 'b';

                        $members[] = new FrameMember(
                            id: "frame-{$frameIndex}-pile-{$sideLabel}-{$pileLabel}",
                            role: 'foundation',
                            start: [$pileX, $y, -$foundationDimensions['height']],
                            end: [$pileX, $y, -$foundationDimensions['height'] - self::TWO_PILE_CAP_PILE_DEPTH_M],
                            section: $footingSection,
                            pile: [
                                'diameter' => self::TWO_PILE_CAP_PILE_DIAMETER_M,
                                'depth' => self::TWO_PILE_CAP_PILE_DEPTH_M,
                            ],
                        );
                    }
                }
            }
        }

        foreach (['left', 'right'] as $sideLabel) {
            $x = $sideLabel === 'left' ? -$halfSpan : $halfSpan;

            $members[] = new FrameMember(
                id: "eaves-tie-{$sideLabel}",
                role: 'tie',
                start: [$x, 0.0, $design->eavesHeight],
                end: [$x, ($frameCount - 1) * $design->baySpacing, $design->eavesHeight],
                section: $tieSection,
            );
        }

        return $members;
    }

    private function frameCount(PortalFrameDesign $design): int
    {
        $bayCount = max(1, (int) round($design->buildingLength / $design->baySpacing));

        return $bayCount + 1;
    }

    /**
     * @return array{width: float, depth: float, height: float, type: 'pile_cap'|'reinforced_pad'|'mass_filled'}
     */
    private function foundationDimensions(PortalFrameDesign $design): array
    {
        if ($design->foundationType === 'two_pile_cap') {
            $pileDiameter = self::TWO_PILE_CAP_PILE_DIAMETER_M;
            $pileSpacing = $pileDiameter * self::TWO_PILE_CAP_PILE_SPACING_FACTOR;
            $edgeDistance = max(1.5 * $pileDiameter, 0.3);

            return [
                'width' => $this->roundUp($pileSpacing + (2 * $edgeDistance), 0.05),
                'depth' => $this->roundUp(max(3 * $pileDiameter, 0.75), 0.05),
                'height' => $this->roundUp(max(1.5 * $pileDiameter, 0.45), 0.05),
                'type' => 'pile_cap',
            ];
        }

        if ($design->foundationType === 'mass_filled') {
            return [
                'width' => 2.1,
                'depth' => 2.1,
                'height' => 0.85,
                'type' => 'mass_filled',
            ];
        }

        return [
            'width' => self::FOOTING_WIDTH_M,
            'depth' => self::FOOTING_DEPTH_M,
            'height' => self::FOOTING_HEIGHT_M,
            'type' => 'reinforced_pad',
        ];
    }

    private function roundUp(float $value, float $increment): float
    {
        return ceil($value / $increment) * $increment;
    }
}
