<?php

namespace App\Data;

readonly class FrameMember
{
    /**
     * @param  'column'|'rafter'|'foundation'|'haunch'  $role
     * @param  array{0: float, 1: float, 2: float}  $start
     * @param  array{0: float, 1: float, 2: float}  $end
     * @param  array{width?: float, depth?: float, height?: float}|null  $footing
     */
    public function __construct(
        public string $id,
        public string $role,
        public array $start,
        public array $end,
        public UbSection $section,
        public ?array $footing = null,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'role' => $this->role,
            'start' => $this->start,
            'end' => $this->end,
            'section' => $this->section->toArray(),
            'footing' => $this->footing,
        ];
    }
}
