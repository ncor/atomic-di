import { Provider } from "./provider";

/**
 * A `Map` of providers to providers of the same type
 * which is then passed to a provider call in a resolution context object
 * in order to replace providers with their mocks.
 */
export type MockMap = Omit<Map<Provider<any>, Provider<any>>, "set" | "get"> & {
    /**
     * Sets a mock for a provider.
     *
     * @param provider - The original provider.
     * @param mock - The mock provider.
     */
    set<T>(provider: Provider<T>, mock: Provider<T>): MockMap;
    /**
     * Retrieves a mock of a provider. Returns undefined if there's none.
     *
     * @param provider - The provider.
     */
    get<T>(provider: Provider<T>): Provider<T> | undefined;
};

/**
 * Creates a `Map` of providers to providers of the same type
 * which is then passed to a provider call in a resolution context object
 * in order to replace providers with their mocks.
 *
 * @returns The map instance.
 */
export const createMockMap = (): MockMap => new Map();
