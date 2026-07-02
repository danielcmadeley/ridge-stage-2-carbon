<?php

namespace App\Enums;

enum SchemeStatus: string
{
    case Draft = 'draft';
    case Verified = 'verified';
    case Archived = 'archived';

    /**
     * Get the display label for the status.
     */
    public function label(): string
    {
        return ucfirst($this->value);
    }
}
