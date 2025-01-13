import { Provider } from "./provider";

/**
 * A map of providers to providers of the same type.
 * Lifetime is not a part of `Provider` type, so you can use
 * a different one if necessary.
 *
 * Passed to a provider call in a resolution context object
 * in order to replace providers with their mocks.
 * ```ts
 * const otherProvider =
 *     transitive(() => ...)
 * const otherProviderMock: typeof otherProvider =
 *     scoped(() => ...)
 *
 * const mocks = createMockMap()
 * mocks.set(otherProvider, otherProviderMock)
 *
 * provider({ mocks })
 * ```
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
 * Creates a mock map instance,
 * a map of providers to providers of the same type.
 * Lifetime is not a part of `Provider` type, so you can use
 * a different one if necessary.
 *
 * Passed to a provider call in a resolution context object
 * in order to replace providers with their mocks.
 * ```ts
 * const otherProvider =
 *     transitive(() => ...)
 * const otherProviderMock: typeof otherProvider =
 *     scoped(() => ...)
 *
 * const mocks = createMockMap()
 * mocks.set(otherProvider, otherProviderMock)
 *
 * provider({ mocks })
 * ```
 *
 * @returns The mock map instance.
 */
export const createMockMap = (): MockMap => new Map();
