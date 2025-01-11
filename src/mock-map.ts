import { Provider } from "./provider";

type MockMapEntries = [Provider<any>, Provider<any>][];

/**
 * Stores and provides provider mocks.
 */
export type MockMap = {
    entries: MockMapEntries;

    /**
     * Returns the provider's mock or the provider itself
     * depending on the presence of the mock.
     *
     * @returns The passed provider or its mock.
     */
    map<T>(
        /**
         * An original provider whose mock is needed to get.
         */
        provider: Provider<T>,
    ): Provider<T>;

    /**
     * Registers a mock provider and retursns a new mock map with that mock.
     *
     * @returns A new mock map with added mock.
     */
    add<T>(
        /**
         * An original provider.
         */
        provider: Provider<T>,
        /**
         * A provider that will be a mock of the first provider.
         */
        replacement: Provider<T>,
    ): MockMap;

    /**
     * Applies mocks from another map to the current one and returns a new map.
     * If there are identical keys (original providers),
     * they will be overwritten by mocks from the other map.
     *
     * @returns A new mock map with applied mocks.
     */
    apply(
        /**
         * A mock map that will be applied.
         */
        otherMockMap: MockMap,
    ): MockMap;
};

/**
 * Creates a new mock map that stores and provides provider mocks.
 *
 * @returns A new mock map.
 */
export const createMockMap = (
    /**
     * Entries of a mock map.
     */
    entries: MockMapEntries = [],
) => {
    const map: MockMap["map"] = (provider) =>
        entries.find((e) => e[0] === provider)?.[1] || provider;

    const add: MockMap["add"] = (provider, replacement) => {
        const newEntries: MockMapEntries = entries.map((e) =>
            e[0] === provider ? [e[0], replacement] : e,
        );

        if (newEntries.length === entries.length)
            newEntries.push([provider, replacement]);

        return createMockMap(newEntries);
    };

    const apply: MockMap["apply"] = (otherMockMap) =>
        createMockMap([
            ...entries.filter(
                (e) =>
                    otherMockMap.entries.find((oe) => oe[0] === e[0]) ===
                    undefined,
            ),
            ...otherMockMap.entries,
        ]);

    return { entries, map, add, apply };
};
