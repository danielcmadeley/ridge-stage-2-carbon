import { ref, toValue } from 'vue';
import type { MaybeRefOrGetter, Ref } from 'vue';
import { geocodeAddress } from '@/lib/map/geocode-address';
import type { GeocodedAddress } from '@/lib/map/geocode-address';

const MINIMUM_QUERY_LENGTH = 3;

export type UseAddressSearchOptions = {
    teamSlug: MaybeRefOrGetter<string | null>;
    missingTeamMessage?: string;
    /** Invoked when the search returns exactly one match. */
    onSingleResult?: (result: GeocodedAddress) => void | Promise<void>;
};

export type UseAddressSearchReturn = {
    query: Ref<string>;
    results: Ref<GeocodedAddress[]>;
    error: Ref<string | null>;
    isSearching: Ref<boolean>;
    search: () => Promise<void>;
};

/**
 * Geocode-search state machine shared by the location tab and onboarding:
 * validates the query, surfaces API errors, and auto-selects a lone match.
 */
export function useAddressSearch(
    options: UseAddressSearchOptions,
): UseAddressSearchReturn {
    const query = ref('');
    const results = ref<GeocodedAddress[]>([]);
    const error = ref<string | null>(null);
    const isSearching = ref(false);

    async function search(): Promise<void> {
        error.value = null;
        results.value = [];

        const teamSlug = toValue(options.teamSlug);

        if (!teamSlug) {
            error.value = options.missingTeamMessage ?? 'Select a team first.';

            return;
        }

        const trimmedQuery = query.value.trim();

        if (trimmedQuery.length < MINIMUM_QUERY_LENGTH) {
            error.value = 'Enter at least three characters to search.';

            return;
        }

        isSearching.value = true;

        try {
            const matches = await geocodeAddress(teamSlug, trimmedQuery);

            if (matches.length === 0) {
                error.value = 'No matching addresses were found.';

                return;
            }

            results.value = matches;

            if (matches.length === 1) {
                await options.onSingleResult?.(matches[0]);
            }
        } catch (caught) {
            error.value =
                caught instanceof Error
                    ? caught.message
                    : 'Could not search for that address.';
        } finally {
            isSearching.value = false;
        }
    }

    return { query, results, error, isSearching, search };
}
