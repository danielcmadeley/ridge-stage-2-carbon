import type { InertiaLinkProps } from '@inertiajs/vue3';
import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { toRaw, isRef } from 'vue';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function toUrl(href: NonNullable<InertiaLinkProps['href']>) {
    return typeof href === 'string' ? href : href?.url;
}

/**
 * Recursively unwrap Vue reactivity so the result is a tree of plain values
 * safe for `structuredClone`, `postMessage`, or any API that rejects Proxies.
 *
 * `toRaw` alone only strips the top-level proxy; nested reactive objects stay
 * as Proxies, which `structuredClone` refuses to copy (DataCloneError). This
 * walks arrays, objects, and refs so every level is detached.
 */
export function deepToRaw<T>(value: T): T {
    if (isRef(value)) {
        return deepToRaw(value.value) as unknown as T;
    }

    const raw = toRaw(value);

    if (Array.isArray(raw)) {
        return raw.map(deepToRaw) as unknown as T;
    }

    if (raw !== null && typeof raw === 'object') {
        const plain: Record<string, unknown> = {};

        for (const key of Object.keys(raw)) {
            plain[key] = deepToRaw((raw as Record<string, unknown>)[key]);
        }

        return plain as unknown as T;
    }

    return raw;
}
