import { Resolver } from "./resolver";

type PromiseAwarePartial<T> =
    T extends Promise<infer U> ? Promise<Partial<U>> : Partial<T>;

type Mock<T> =
    | {
          isPartial: false;
          resolver: Resolver<T>;
      }
    | {
          isPartial: true;
          resolver: Resolver<PromiseAwarePartial<T>>;
      };

type MocksEntries = [Resolver<any>, Mock<any>][];

/**
 * Immutable map that registers and provides mocks.
 * Is passed in a resolution context and used by resolvers
 * to replace or partially replace themselves with a mock if one is defined.
 */
export type MockMap = {
    /**
     * Registers a mock for a resolver,
     * creating a new `MockMap` with this registration.
     *
     * @param original - The original resolver.
     * @param mock - The mock resolver.
     */
    mock<T>(original: Resolver<T>, mock: Resolver<T>): MockMap;
    /**
     * Registers a partial mock for a resolver,
     * creating a new `MockMap` with this registration.
     * In this case, the mock resolver's resolution object will be
     * merged with the original resolver's resolution object,
     * overwriting certain fields.
     *
     * @param original - The original resolver.
     * @param mock - The mock resolver.
     */
    mockPartially<T extends object>(
        original: Resolver<T>,
        mock: Resolver<PromiseAwarePartial<T>>,
    ): MockMap;
    /**
     * Returns a mock of a resolver
     * or `undefined` if one is not registered.
     *
     * @param original - The original resolver.
     */
    get<T>(original: Resolver<T>): Mock<T> | undefined;
};

/**
 * Internal implementation that accepts entries.
 */
const createMockMapWithEntries = (entries: MocksEntries = []): MockMap => {
    const set = (key: Resolver<any>, value: Mock<any>) =>
        createMockMapWithEntries([
            ...entries.filter((entry) => entry[0] !== key),
            [key, value],
        ]);

    return {
        mock(original, mock) {
            return set(original, {
                isPartial: false,
                resolver: mock,
            });
        },
        mockPartially(original, mock) {
            return set(original, {
                isPartial: true,
                resolver: mock,
            });
        },
        get(original) {
            return entries.find((entry) => entry[0] === original)?.[1] as any;
        },
    };
};

/**
 * Creates a mock map, an immutable map that registers and provides mocks.
 * Is passed in a resolution context and used by resolvers
 * to replace or partially replace themselves with a mock if one is defined.
 *
 * @example
 * ```ts
 * const mocks = createMockMap()
 *     .mock(getDependency, getDependencyMock)
 *     .mockPartially(
 *         getOtherDepedency,
 *         transient(() => ({ someField: "mock" }))
 *     )
 *
 * const entityWithMocks = getEntity({ mocks })
 * ```
 *
 * @returns The mock map.
 */
export const createMockMap = () => createMockMapWithEntries();
