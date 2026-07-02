<?php

namespace App\Services\PortalFrame;

use App\Data\PortalFrameDesign;

class PortalFrameDesignResolver
{
    public function __construct(
        private readonly PortalFrameGeometryBuilder $geometryBuilder,
        private readonly PortalFrameRenderAdjustments $renderAdjustments,
        private readonly PortalFrameHaunchBuilder $haunchBuilder,
    ) {}

    /**
     * @return array{
     *     design: array<string, float|int|string>,
     *     rafterLineLoadKnM: float,
     *     lookupSpanM: int,
     *     rafter: array{name: string, h: float, b: float, tw: float, tf: float},
     *     column: array{name: string, h: float, b: float, tw: float, tf: float},
     *     members: list<array<string, mixed>>
     * }
     */
    public function resolve(PortalFrameDesign $design): array
    {
        $built = $this->geometryBuilder->build($design);

        return [
            'design' => $design->toArray(),
            'rafterLineLoadKnM' => $built['rafterLineLoadKnM'],
            'lookupSpanM' => $built['lookupSpanM'],
            'rafter' => $built['rafter']->toArray(),
            'column' => $built['column']->toArray(),
            'members' => array_map(
                static fn ($member) => $member->toArray(),
                $built['members'],
            ),
        ];
    }

    /**
     * @return array{
     *     design: array<string, float|int|string>,
     *     rafterLineLoadKnM: float,
     *     lookupSpanM: int,
     *     rafter: array{name: string, h: float, b: float, tw: float, tf: float},
     *     column: array{name: string, h: float, b: float, tw: float, tf: float},
     *     members: list<array<string, mixed>>,
     *     haunches: list<array<string, mixed>>
     * }
     */
    public function resolveForExport(PortalFrameDesign $design): array
    {
        $built = $this->geometryBuilder->build($design);
        $analysisMembers = $built['members'];
        $renderMembers = $this->renderAdjustments->adjust($analysisMembers);
        $haunches = $this->haunchBuilder->build($analysisMembers, $renderMembers, $design->span);

        return [
            'design' => $design->toArray(),
            'rafterLineLoadKnM' => $built['rafterLineLoadKnM'],
            'lookupSpanM' => $built['lookupSpanM'],
            'rafter' => $built['rafter']->toArray(),
            'column' => $built['column']->toArray(),
            'members' => array_map(
                static fn ($member) => $member->toArray(),
                $renderMembers,
            ),
            'haunches' => array_map(
                static fn ($haunch) => $haunch->toArray(),
                $haunches,
            ),
        ];
    }
}
