<?php

namespace App\Data;

readonly class PortalFrameDesign
{
    /**
     * @param  'restrained'|'unrestrained'  $columnRestraint
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
        );
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
        );
    }

    public function rafterLineLoadKnM(): float
    {
        return ($this->deadLoadKnM2 + $this->liveLoadKnM2) * $this->baySpacing;
    }

    /**
     * @return array<string, float|int|string>
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
        ];
    }
}
