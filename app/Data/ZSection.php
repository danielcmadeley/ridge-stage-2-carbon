<?php

namespace App\Data;

readonly class ZSection implements MemberSection
{
    public function __construct(
        public string $name,
        public float $depth,
        public float $topFlange,
        public float $bottomFlange,
        public float $t,
        public float $areaCm2,
    ) {}

    /**
     * @return array<string, float|string>
     */
    public function toArray(): array
    {
        return [
            'profile' => 'z',
            'name' => $this->name,
            'depth' => $this->depth,
            'topFlange' => $this->topFlange,
            'bottomFlange' => $this->bottomFlange,
            't' => $this->t,
            'areaCm2' => $this->areaCm2,
        ];
    }
}
