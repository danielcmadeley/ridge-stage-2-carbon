<?php

namespace App\Concerns;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Generates a unique slug from a source attribute, optionally scoped to a
 * parent column (e.g. per-team projects or per-project buildings).
 */
trait GeneratesUniqueSlug
{
    public static function bootGeneratesUniqueSlug(): void
    {
        static::creating(function (Model $model) {
            if (empty($model->slug)) {
                $model->slug = static::generateUniqueSlug($model->{static::slugSource()}, $model);
            }
        });

        static::updating(function (Model $model) {
            if ($model->isDirty(static::slugSource())) {
                $model->slug = static::generateUniqueSlug($model->{static::slugSource()}, $model);
            }
        });
    }

    /**
     * The attribute used to derive the slug.
     */
    protected static function slugSource(): string
    {
        return 'name';
    }

    /**
     * The column the slug must be unique within, if any.
     */
    protected static function slugScopeColumn(): ?string
    {
        return null;
    }

    protected static function generateUniqueSlug(string $value, Model $model): string
    {
        $base = Str::slug($value);

        $query = static::withTrashed()
            ->where(function ($query) use ($base) {
                $query->where('slug', $base)->orWhere('slug', 'like', $base.'-%');
            });

        if ($model->exists) {
            $query->where($model->getKeyName(), '!=', $model->getKey());
        }

        if ($scope = static::slugScopeColumn()) {
            $query->where($scope, $model->{$scope});
        }

        $existingSlugs = $query->pluck('slug');

        if ($existingSlugs->isEmpty()) {
            return $base;
        }

        $maxSuffix = $existingSlugs
            ->map(function (string $slug) use ($base): ?int {
                if ($slug === $base) {
                    return 0;
                }

                if (preg_match('/^'.preg_quote($base, '/').'-(\d+)$/', $slug, $matches)) {
                    return (int) $matches[1];
                }

                return null;
            })
            ->filter(fn (?int $suffix) => $suffix !== null)
            ->max() ?? 0;

        return $base.'-'.($maxSuffix + 1);
    }
}
