import { Provider } from "./provider";
import { createImmutableMap, ImmutableMap } from "./readonly-map";

/**
 * A map of providers to their compatible versions.
 *
 * Passed to a provider call in a resolution context object
 * in order to replace providers with their mocks.
 * ```ts
 * const mocks = createMockMap().set(otherProvider, otherProviderMock)
 * provider({ mocks })
 * ```
 */
export type MockMap = ImmutableMap<Provider<any>, Provider<any>>;

/**
 * Creates a mock map instance.
 *
 * Passed to a provider call in a resolution context object
 * in order to replace providers with their mocks.
 * ```ts
 * const mocks = createMockMap().set(otherProvider, otherProviderMock)
 * provider({ mocks })
 * ```
 *
 * @returns The mock map instance.
 */
export const createMockMap = (): MockMap => createImmutableMap();
