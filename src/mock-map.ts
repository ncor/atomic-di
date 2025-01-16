import { Resolver } from "./provider";

/**
 * A `Map` of providers to providers of the same type
 * which is then passed to a provider call in a resolution context object
 * in order to replace providers with their mocks.
 */
export type MockMap = Omit<Map<Resolver<any>, Resolver<any>>, "set" | "get"> & {
    /**
     * Sets a mock for a provider.
     *
     * @param provider - The original provider.
     * @param mock - The mock provider.
     */
    set<T>(provider: Resolver<T>, mock: Resolver<T>): MockMap;
    /**
     * Retrieves a mock of a provider. Returns undefined if there's none.
     *
     * @param provider - The provider.
     */
    get<T>(provider: Resolver<T>): Resolver<T> | undefined;
};

/**
 * Creates a `Map` of providers to providers of the same type
 * which is then passed to a provider call in a resolution context object
 * in order to replace providers with their mocks.
 *
 * @example
 * ```ts
 * const mocks = createMockMap()
 *     .set(getConfig, getTestConfig)
 *
 * getThing({ mocks })
 * ```
 *
 * @returns The map instance.
 */
export const createMockMap = (): MockMap => new Map();
