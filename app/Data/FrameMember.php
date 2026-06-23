<?php

namespace App\Data;

readonly class FrameMember
{
    /**
     * @param  'column'|'gable_column'|'rafter'|'foundation'|'haunch'|'tie'|'brace'|'purlin'|'side_rail'  $role
     * @param  array{0: float, 1: float, 2: float}  $start
     * @param  array{0: float, 1: float, 2: float}  $end
     * @param  array{width?: float, depth?: float, height?: float}|null  $footing
     * @param  array{diameter: float, depth: float}|null  $pile
     * @param  array{halfSpan: float, roofPitchDeg: float}|null  $orientation
     */
    public function __construct(
        public string $id,
        public string $role,
        public array $start,
        public array $end,
        public MemberSection $section,
        public ?array $footing = null,
        public ?array $pile = null,
        public ?array $orientation = null,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return array_filter([
            'id' => $this->id,
            'role' => $this->role,
            'start' => $this->start,
            'end' => $this->end,
            'section' => $this->section->toArray(),
            'footing' => $this->footing,
            'pile' => $this->pile,
            'orientation' => $this->orientation,
        ], fn (mixed $value): bool => $value !== null);
    }
}
