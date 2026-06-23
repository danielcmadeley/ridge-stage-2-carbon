<?php

namespace App\Data;

readonly class UbSection implements MemberSection
{
    public function __construct(
        public string $name,
        public float $h,
        public float $b,
        public float $tw,
        public float $tf,
    ) {}

    /**
     * @return array{name: string, profile: string, h: float, b: float, tw: float, tf: float}
     */
    public function toArray(): array
    {
        return [
            'profile' => 'ub',
            'name' => $this->name,
            'h' => $this->h,
            'b' => $this->b,
            'tw' => $this->tw,
            'tf' => $this->tf,
        ];
    }
}
