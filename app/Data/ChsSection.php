<?php

namespace App\Data;

readonly class ChsSection implements MemberSection
{
    public function __construct(
        public string $name,
        public float $d,
        public float $t,
        public float $areaCm2,
    ) {}

    /**
     * @return array{profile: string, name: string, d: float, t: float, areaCm2: float}
     */
    public function toArray(): array
    {
        return [
            'profile' => 'chs',
            'name' => $this->name,
            'd' => $this->d,
            't' => $this->t,
            'areaCm2' => $this->areaCm2,
        ];
    }
}
