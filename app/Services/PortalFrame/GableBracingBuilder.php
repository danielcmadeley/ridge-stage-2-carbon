<?php

namespace App\Services\PortalFrame;

use App\Data\ChsSection;
use App\Data\FrameMember;

class GableBracingBuilder
{
    public const ROOF_BRACE_RAFTER_FRACTION = 0.5;

    private const BRACE_SECTION_DESIGNATION = '114.3x5.0 CHS';

    public function __construct(
        private readonly ChsSectionCatalog $chsCatalog,
    ) {}

    /**
     * @return list<FrameMember>
     */
    public function build(
        int $frameCount,
        float $baySpacing,
        float $halfSpan,
        float $eavesHeight,
        float $apexHeight,
        ?ChsSection $section = null,
    ): array {
        if ($frameCount < 2) {
            return [];
        }

        $section ??= $this->chsCatalog->find(self::BRACE_SECTION_DESIGNATION);
        $members = [];
        $rearNearFrame = $frameCount - 2;
        $rearFarFrame = $frameCount - 1;

        $this->addGableEndBracing(
            $members,
            'front',
            0.0,
            $baySpacing,
            $halfSpan,
            $eavesHeight,
            $apexHeight,
            $section,
        );

        $this->addGableEndBracing(
            $members,
            'rear',
            $rearNearFrame * $baySpacing,
            $rearFarFrame * $baySpacing,
            $halfSpan,
            $eavesHeight,
            $apexHeight,
            $section,
        );

        return $members;
    }

    /**
     * @param  list<FrameMember>  $members
     */
    private function addGableEndBracing(
        array &$members,
        string $gable,
        float $yNear,
        float $yFar,
        float $halfSpan,
        float $eavesHeight,
        float $apexHeight,
        ChsSection $section,
    ): void {
        $yEnd = $gable === 'front' ? $yNear : $yFar;
        $yAdjacent = $gable === 'front' ? $yFar : $yNear;

        foreach (['left' => -$halfSpan, 'right' => $halfSpan] as $sideLabel => $x) {
            $this->addWallXBracing(
                $members,
                $gable,
                $sideLabel,
                $x,
                $yNear,
                $yFar,
                $eavesHeight,
                $section,
            );

            $this->addRoofVBracing(
                $members,
                $gable,
                $sideLabel,
                $x,
                $yEnd,
                $yAdjacent,
                $eavesHeight,
                $apexHeight,
                $section,
            );
        }
    }

    /**
     * @param  list<FrameMember>  $members
     */
    private function addWallXBracing(
        array &$members,
        string $gable,
        string $sideLabel,
        float $x,
        float $yNear,
        float $yFar,
        float $eavesHeight,
        ChsSection $section,
    ): void {
        $prefix = "gable-{$gable}-{$sideLabel}-wall";

        $members[] = new FrameMember(
            id: "{$prefix}-ascending",
            role: 'brace',
            start: [$x, $yNear, 0.0],
            end: [$x, $yFar, $eavesHeight],
            section: $section,
        );

        $members[] = new FrameMember(
            id: "{$prefix}-descending",
            role: 'brace',
            start: [$x, $yNear, $eavesHeight],
            end: [$x, $yFar, 0.0],
            section: $section,
        );
    }

    /**
     * @param  list<FrameMember>  $members
     */
    private function addRoofVBracing(
        array &$members,
        string $gable,
        string $sideLabel,
        float $x,
        float $yEnd,
        float $yAdjacent,
        float $eavesHeight,
        float $apexHeight,
        ChsSection $section,
    ): void {
        $prefix = "gable-{$gable}-{$sideLabel}-roof";
        $connectionPoint = $this->pointOnRafter($x, $yAdjacent, $eavesHeight, $apexHeight);

        $members[] = new FrameMember(
            id: "{$prefix}-from-eave",
            role: 'brace',
            start: [$x, $yEnd, $eavesHeight],
            end: $connectionPoint,
            section: $section,
        );

        $members[] = new FrameMember(
            id: "{$prefix}-from-ridge",
            role: 'brace',
            start: [0.0, $yEnd, $apexHeight],
            end: $connectionPoint,
            section: $section,
        );
    }

    /**
     * @return array{0: float, 1: float, 2: float}
     */
    private function pointOnRafter(
        float $x,
        float $y,
        float $eavesHeight,
        float $apexHeight,
    ): array {
        $fraction = self::ROOF_BRACE_RAFTER_FRACTION;

        return [
            $x * (1 - $fraction),
            $y,
            $eavesHeight + ($fraction * ($apexHeight - $eavesHeight)),
        ];
    }
}
