<?php

namespace App\Data;

readonly class PortalFrameDesign
{
    /**
     * @param  'restrained'|'unrestrained'  $columnRestraint
     * @param  'two_pile_cap'|'reinforced_pad'|'mass_filled'  $foundationType
     * @param  array<string, float|int>  $foundationAssumptions
     */
    public function __construct(
        public float $span,
        public float $eavesHeight,
        public float $buildingLength,
        public float $baySpacing,
        public float $deadLoadKnM2,
        public float $liveLoadKnM2,
        public string $columnRestraint,
        public float $roofPitchDeg = 6.0,
        public string $foundationType = 'reinforced_pad',
        public array $foundationAssumptions = [],
    ) {}

    public static function defaults(): self
    {
        return new self(
            span: 24.0,
            eavesHeight: 6.0,
            buildingLength: 40.0,
            baySpacing: 5.0,
            deadLoadKnM2: 1.25,
            liveLoadKnM2: 0.75,
            columnRestraint: 'restrained',
            roofPitchDeg: 6.0,
            foundationType: 'reinforced_pad',
            foundationAssumptions: self::defaultFoundationAssumptions(),
        );
    }

    /**
     * @return array<string, float|int>
     */
    public static function defaultFoundationAssumptions(): array
    {
        return [
            'allowableBearingKpa' => 150,
            'pileWorkingCapacityKn' => 300,
            'pileDiameterM' => 0.45,
            'pileSpacingFactor' => 3,
            'concreteDensityKnM3' => 24,
            'soilCoverDensityKnM3' => 18,
            'frictionCoefficient' => 0.45,
            'concreteCoverM' => 0.05,
            'reinforcementYieldStrengthMpa' => 500,
            'preferredBarDiameterMm' => 12,
        ];
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public static function fromArray(array $attributes): self
    {
        return new self(
            span: (float) $attributes['span'],
            eavesHeight: (float) $attributes['eavesHeight'],
            buildingLength: (float) $attributes['buildingLength'],
            baySpacing: (float) $attributes['baySpacing'],
            deadLoadKnM2: (float) $attributes['deadLoadKnM2'],
            liveLoadKnM2: (float) $attributes['liveLoadKnM2'],
            columnRestraint: (string) $attributes['columnRestraint'],
            roofPitchDeg: (float) ($attributes['roofPitchDeg'] ?? 6.0),
            foundationType: (string) data_get($attributes, 'foundation.type', 'reinforced_pad'),
            foundationAssumptions: array_merge(
                self::defaultFoundationAssumptions(),
                array_map('floatval', data_get($attributes, 'foundation.assumptions', [])),
            ),
        );
    }

    public function rafterLineLoadKnM(): float
    {
        return ($this->deadLoadKnM2 + $this->liveLoadKnM2) * $this->baySpacing;
    }

    /**
     * @return array<string, float|int|string|array<string, mixed>>
     */
    public function toArray(): array
    {
        return [
            'span' => $this->span,
            'eavesHeight' => $this->eavesHeight,
            'buildingLength' => $this->buildingLength,
            'baySpacing' => $this->baySpacing,
            'deadLoadKnM2' => $this->deadLoadKnM2,
            'liveLoadKnM2' => $this->liveLoadKnM2,
            'columnRestraint' => $this->columnRestraint,
            'roofPitchDeg' => $this->roofPitchDeg,
            'foundation' => [
                'type' => $this->foundationType,
                'assumptions' => $this->foundationAssumptions,
            ],
        ];
    }
}
