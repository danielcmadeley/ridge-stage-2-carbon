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
        public float $servicesLoadKnM2,
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
            deadLoadKnM2: 0.30,
            servicesLoadKnM2: 0.25,
            liveLoadKnM2: 0.60,
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
            'pileDepthM' => 6,
            'concreteDensityKnM3' => 24,
            'soilCoverDensityKnM3' => 18,
            'effectiveFrictionAngleDeg' => 30,
            'interfaceFrictionAngleDeg' => 20,
            'retainedSoilDepthM' => 0.6,
            'soilModulusKnM2' => 25000,
            'concreteStrengthMpa' => 28,
            'capOverhangMm' => 150,
            'rebarRateKgM3' => 110,
            'rebarUpliftFactor' => 1.10,
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
            servicesLoadKnM2: (float) ($attributes['servicesLoadKnM2'] ?? 0),
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
        return ($this->deadLoadKnM2 + $this->servicesLoadKnM2 + $this->liveLoadKnM2) * $this->baySpacing;
    }

    /**
     * ULS factored area load, kN/m^2: gamma_G * (dead + services) + gamma_Q * live.
     */
    public function factoredAreaLoadKnM2(): float
    {
        return 1.35 * ($this->deadLoadKnM2 + $this->servicesLoadKnM2) + 1.5 * $this->liveLoadKnM2;
    }

    /**
     * Interior-frame ULS factored line load used for section lookup, kN/m.
     */
    public function factoredRafterLineLoadKnM(): float
    {
        return $this->factoredAreaLoadKnM2() * $this->baySpacing;
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
            'servicesLoadKnM2' => $this->servicesLoadKnM2,
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
