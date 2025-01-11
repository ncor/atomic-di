import { Provider } from "./provider";
import { Scope } from "./scope";
import { MockMap } from "./mock-map";

/**
 * A map of string keys to providers.
 */
type ProviderMap = Record<string, Provider<any>>;

type InferProviderMapOutputs<Providers extends ProviderMap> = {
    [K in keyof Providers]: Providers[K] extends Provider<infer T> ? T : never;
};

/**
 * Resolves all providers in a `ProviderMap` and
 * returns an object containing their instances.
 *
 * @returns An object containing the resolved instances of the providers.
 */
type ProviderSelectionCallable<Providers extends ProviderMap> = (
    /**
     * An optional scope to use for scoped providers.
     */
    scope?: Scope,
    /**
     * An optional mock map to use for mocking providers.
     */
    mockMap?: MockMap,
) => InferProviderMapOutputs<Providers>;

/**
 * A selection of providers.
 */
export type ProviderSelection<Providers extends ProviderMap> =
    ProviderSelectionCallable<Providers> & {
        /**
         * The `ProviderMap` that the selection is based on.
         */
        map: Providers;
        /**
         * Mocks a provider within the selection, returning a new
         * `ProviderSelection` with the mock applied.
         *
         * @returns A new `ProviderSelection` with the mocked provider.
         */
        mock<T>(
            /**
             * A provider used by the current provider
             * that needs to be replaced.
             */
            dependencyProvider: Provider<T>,
            /**
             * A provider with a same interface that will be
             * a replacement for the first one.
             */
            replacement: Provider<T>,
        ): ProviderSelection<Providers>;
    };

/**
 * Creates a new provider selection from a provider map.
 *
 * @returns A new provider selection.
 */
export const select = <Providers extends ProviderMap>(
    /**
     * A map of string keys to providers.
     */
    map: Providers,
): ProviderSelection<Providers> => {
    type SelectionType = ProviderSelection<Providers>;

    const resolveAll: ProviderSelectionCallable<Providers> = (
        scope,
        mockMap,
    ) => {
        const resultEntries = Object.entries(map).map(([key, provider]) =>
            mockMap
                ? [key, mockMap.map(provider)(scope, mockMap)]
                : [key, provider(scope, mockMap)],
        );

        return Object.fromEntries(
            resultEntries,
        ) as InferProviderMapOutputs<Providers>;
    };

    const mock: SelectionType["mock"] = (dependencyProvider, replacement) => {
        const newEntries = Object.entries(map).map(([key, provider]) =>
            provider === dependencyProvider
                ? [key, replacement]
                : [key, provider.mock(dependencyProvider, replacement)],
        );

        return select(Object.fromEntries(newEntries) as Providers);
    };

    return Object.assign(resolveAll, { map, mock });
};
