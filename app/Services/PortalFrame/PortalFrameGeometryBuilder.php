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

    public function __construct(
        private readonly P399SectionLookup $p399Lookup,
        private readonly UbSectionCatalog $ubCatalog,
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

        $rafterLineLoad = $design->rafterLineLoadKnM();
        $lookupSpan = $this->p399Lookup->snapSpan($design->span);

        $rafterDesignation = $this->p399Lookup->lookup(
            'Rafter',
            $rafterLineLoad,
            $design->eavesHeight,
            $design->span,
        );

        $columnMemberType = $design->columnRestraint === 'unrestrained'
            ? 'Unrestrained Column'
            : 'Restrained Column';

        $columnDesignation = $this->p399Lookup->lookup(
            $columnMemberType,
            $rafterLineLoad,
            $design->eavesHeight,
            $design->span,
        );

        $rafterSection = $this->ubCatalog->find($rafterDesignation);
        $columnSection = $this->ubCatalog->find($columnDesignation);

        $members = $this->buildMembers($design, $rafterSection, $columnSection);

        return [
            'rafterLineLoadKnM' => $rafterLineLoad,
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
    ): array {
        $members = [];
        $frameCount = max(1, (int) round($design->buildingLength / $design->baySpacing));
        $halfSpan = $design->span / 2;
        $pitchRadians = deg2rad($design->roofPitchDeg);
        $apexHeight = $design->eavesHeight + ($halfSpan * tan($pitchRadians));
        $footingSection = new UbSection(
            name: 'Footing',
            h: self::FOOTING_HEIGHT_M * 1000,
            b: self::FOOTING_WIDTH_M * 1000,
            tw: self::FOOTING_DEPTH_M * 1000,
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
