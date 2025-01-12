export type Entry<K, V> = [K, V];
export type Entries<K, V> = Entry<K, V>[];

/**
 * An immutable map. It's similar to `Map`,
 * but with reduced functionality and readonly builder behavior.
 */
export type ImmutableMap<K, V> = {
    /**
     * Map's entries.
     */
    readonly entries: Entries<K, V>;

    /**
     * Retrieves a possibly existing value under a key.
     *
     * @param key - The key associated with the value.
     *
     * @returns The value or undefined.
     */
    get(key: K): V | undefined;

    /**
     * Sets a value under a key.
     *
     * @param key - The key that will be associated with the value.
     * @param value - The value to set.
     *
     * @returns A modified immutable map with the value being set in it.
     */
    set(key: K, value: V): ImmutableMap<K, V>;

    /**
     * Merges two immutable maps. If there're any matching keys,
     * values from the second map will override values from the first map.
     *
     * @param other The second immutable map.
     *
     * @returns A new immutable map as a result of merging two maps.
     */
    merge(other: ImmutableMap<K, V>): ImmutableMap<K, V>;
};

/**
 * Creates an immutable map. It's similar to `Map`,
 * but with reduced functionality and readonly builder behavior.
 *
 * @param entries - Map's entries.
 *
 * @returns The immutable map.
 */
export const createImmutableMap = <K, V>(
    entries: Entries<K, V> = [],
): ImmutableMap<K, V> => {
    const get = (key: K) => entries.find((entry) => entry[0] === key)?.[1];

    const set = (key: K, value: V) => {
        if (get(key) !== undefined) {
            const newEntries: Entries<K, V> = entries.map((entry) =>
                entry[0] === key ? [entry[0], value] : entry,
            );

            return createImmutableMap(newEntries);
        }

        const newEntries: Entries<K, V> = [...entries, [key, value]];

        return createImmutableMap(newEntries);
    };

    const merge = (other: ImmutableMap<K, V>) => {
        const newEntries: Entries<K, V> = [
            ...entries.filter((entry) => other.get(entry[0]) === undefined),
            ...other.entries,
        ];

        return createImmutableMap(newEntries);
    };

    return Object.freeze({
        entries,
        get,
        set,
        merge,
    });
};
