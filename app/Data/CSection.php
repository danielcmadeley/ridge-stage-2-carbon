<?php

namespace App\Data;

readonly class CSection implements MemberSection
{
    public function __construct(
        public string $name,
        public float $depth,
        public float $flange,
        public float $t,
        public float $areaCm2,
    ) {}

    /**
     * @return array<string, float|string>
     */
    public function toArray(): array
    {
        return [
            'profile' => 'c',
            'name' => $this->name,
            'depth' => $this->depth,
            'flange' => $this->flange,
            't' => $this->t,
            'areaCm2' => $this->areaCm2,
        ];
    }
}
