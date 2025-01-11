import { once } from "./helpers";
import { Scope } from "./scope";
import { createMockMap, MockMap } from "./mock-map";

/**
 * Calls a resolver(factory) with an optional scope and a mock map
 * and returns an instance.
 *
 * A passed scope will be propagated up a graph and will be passed
 * to all scoped providers to resolve their instance within this scope.
 * If a provider is scoped, it will either create a new instance
 * and store it in the scope, or retrieve an already created instance
 * from the scope.
 *
 * It is also possible to explicitly pass a mock map, but It's not recommended.
 * If you want to mock(replace) providers for a resolution,
 * it's best to use `mock` method.
 */
type ProviderCallable<T> = (scope?: Scope, mockMap?: MockMap) => T;

/**
 * Instance factory with lifetime and dynamic context.
 */
export type Provider<T> = ProviderCallable<T> & {
    /**
     * Mocks(replaces) a provider within the visible graph,
     * returning a new provider with that mock.
     *
     * @returns A new provider with the mocked dependency provider.
     */
    mock<U>(
        /**
         * A provider used by the current provider
         * that needs to be replaced.
         */
        dependencyProvider: Provider<U>,
        /**
         * A provider with a same interface
         * that will be a replacement for the first one.
         */
        replacement: Provider<U>,
    ): Provider<T>;
};

type Lifetime = "transient" | "singleton" | "scoped";

/**
 * A function that resolves an instance of a passed provider.
 * It's needed to resolve correct instance in a scope
 * and to use mock of the passed provider, if any.
 */
type UseFn = <T>(provider: Provider<T>) => T;

/**
 * A function that creates an instance by resolving its dependencies.
 * If there are dependencies, you must use `use` function passed
 * in the first argument.
 */
type Resolver<T> = (use: UseFn) => T;

/**
 * Creates a new provider, instance factory with lifetime and dynamic context.
 *
 * @returns A new provider.
 */
export const provide = <T>(
    /**
     * Instance lifetime. Can be `"transient"`, `"singleton"` or `"scoped"`.
     *
     * If `"transient"`, will return a new instance on each resolution.
     *
     * If `"singleton"`, will create an instance once and return it on every request.
     *
     * If `"scoped"`, will save the instance in scope on first resolution
     * and will retrieve it from scope on next resolutions.
     * If scope was not specified, will create a new instance on each resolution.
     */
    lifetime: Lifetime,

    /**
     * A function that creates an instance by resolving its dependencies.
     * If there are dependencies, you must use `use` function passed
     * in the first argument.
     */
    resolver: Resolver<T>,

    /**
     * An optional mock map. Not recommended to specify explicitly,
     * use `mock` method to mock providers.
     */
    mockMap: MockMap = createMockMap(),
): Provider<T> => {
    type ProviderType = Provider<T>;

    const getSelf = once(() => Object.assign(resolve, properties));

    const originalResolver = resolver;
    resolver = lifetime === "singleton" ? once(resolver) : resolver;

    const resolve: ProviderCallable<T> = (scope, requestMockMap) => {
        const currentMockMap = requestMockMap
            ? mockMap.apply(requestMockMap)
            : mockMap;

        const use: UseFn = (provider) =>
            currentMockMap.map(provider)(scope, currentMockMap);

        if (lifetime !== "scoped" || !scope) return resolver(use);

        const resolution = scope.get(getSelf()) || resolver(use);
        scope.set(getSelf(), resolution);

        return resolution;
    };

    const mock: ProviderType["mock"] = (dependencyProvider, replacement) =>
        provide(
            lifetime,
            originalResolver,
            mockMap.add(dependencyProvider, replacement),
        );

    const properties = {
        mock,
    };

    return getSelf();
};

/**
 * Creates a new transient provider.
 * This provider will return a new instance on each resolution.
 *
 * @returns A new transient provider.
 */
export const transient = <T>(
    /**
     * A function that creates an instance by resolving its dependencies.
     * If there are dependencies, you must use `use` function passed
     * in the first argument.
     */
    resolver: Resolver<T>,
) => provide("transient", resolver);

/**
 * Creates a new singleton provider.
 * This provider will create an instance once and return it on every request.
 *
 * @returns A new singleton provider.
 */
export const singleton = <T>(
    /**
     * A function that creates an instance by resolving its dependencies.
     * If there are dependencies, you must use `use` function passed
     * in the first argument.
     */
    resolver: Resolver<T>,
) => provide("singleton", resolver);

/**
 * Creates a new transient provider.
 * This provider will save the instance in scope on first resolution
 * and will retrieve it from scope on next resolutions.
 * If scope was not specified, will create a new instance on each resolution.
 *
 * @returns A new scoped provider.
 */
export const scoped = <T>(
    /**
     * A function that creates an instance by resolving its dependencies.
     * If there are dependencies, you must use `use` function passed
     * in the first argument.
     */
    resolver: Resolver<T>,
) => provide("scoped", resolver);
