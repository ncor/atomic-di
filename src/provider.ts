import { once } from "./helpers";
import { MockMap } from "./mock-map";
import { Scope } from "./scope";

/**
 * A wrapper around the resolver(factory) for contextual dependency resolution.
 *
 * Resolves an instance by calling a resolver
 * with an **optional** resolution context that will be propagated
 * throughout a dependency tree.
 * ```ts
 * provider({ scope, mocks })
 * ```
 *
 * When passing a scope it will try to get an instance from it
 * or create a new one and put it there.
 *
 * When passing mocks, it will try to get its own mock version,
 * and if there is one, it will use it instead of itself.
 */
export type Provider<T> = (context?: ResolutionContext) => T;

/**
 * A resolution lifetime.
 *
 * Passed when creating a provider to determine its behavior.
 *
 * `"transient"` doesn't provide any modifications to a resolver behaviour,
 * so the resolver will create a new instance on each request.
 *
 * `"singleton"` forces the resolver to create an instance once
 * and return it in subsequent requests.
 *
 * `"scoped"` forces the resolver to take its instance from a provided scope
 * or create a new one and save it if there is none.
 * If no scope is passed, it will create a new instance on each request.
 */
export type Lifetime = "transient" | "singleton" | "scoped";

/**
 * A function that creates an instance using a resolution context.
 */
export type Resolver<T> = (context?: ResolutionContext) => T;

/**
 * An object that holds information about a scope and provider mocks.
 *
 * Passed to the provider call to resolve scope instances and mock providers.
 */
export type ResolutionContext = {
    scope?: Scope;
    mocks?: MockMap;
};

/**
 * Creates a provider instance,
 * a wrapper around a resolver(factory) for contextual dependency resolution.
 * ```ts
 * const getInstance = provide("transient", () =>
 *     createInstance(
 *         getOtherInstance(context)
 *     )
 * )
 * ```
 *
 * @param lifetime
 * A resolution lifetime.
 *
 * `"transient"` doesn't provide any modifications to a resolver behaviour,
 * so the resolver will create a new instance on each request.
 *
 * `"singleton"` forces the resolver to create an instance once
 * and return it in subsequent requests.
 *
 * `"scoped"` forces the resolver to take its resolution from a provided scope
 * or create a new one and save it if there is none.
 * If no scope is passed, it will create a new instance on each request.
 *
 * @param resolver
 * The function that creates an instance using a resolution context.
 * If the function calls other providers,
 * the context **must** be passed to their calls.
 *
 * @returns The provider instance.
 */
export const provide = <T>(
    lifetime: Lifetime,
    resolver: Resolver<T>,
): Provider<T> => {
    resolver = lifetime === "singleton" ? once(resolver) : resolver;

    const resolve: Provider<T> = (context) => {
        const maybeOwnMock = context?.mocks?.get(resolve);
        if (maybeOwnMock) return maybeOwnMock(context);

        if (lifetime !== "scoped" || !context?.scope) return resolver(context);

        const resolution = context.scope.has(resolve)
            ? context.scope.get(resolve)
            : resolver(context);
        context.scope.set(resolve, resolution);

        return resolution;
    };

    return resolve;
};

/**
 * An alias for `provide("transient", ...)`.
 * Creates a transient provider instance,
 * a wrapper around a resolver(factory) for contextual dependency resolution
 * that will create a new instance on each request.
 * ```ts
 * const getInstance = transient((context) =>
 *     createInstance(...)
 * )
 *
 * getInstance() !== getInstance()
 * ```
 *
 * @param resolver
 * The function that creates an instance using a resolution context.
 *
 * @returns The transient provider instance.
 */
export const transient = <T>(resolver: Resolver<T>): Provider<T> =>
    provide("transient", resolver);

/**
 * An alias for `provide("singleton", ...)`.
 * Creates a transient provider instance,
 * a wrapper around a resolver(factory) for contextual dependency resolution
 * that will create an instance once and return it in subsequent requests.
 * ```ts
 * const getInstance = singleton((context) =>
 *     createInstance(...)
 * )
 *
 * getInstance() === getInstance()
 * ```
 *
 * @param resolver
 * The function that creates an instance using a resolution context.
 *
 * @returns The singleton provider instance.
 */
export const singleton = <T>(resolver: Resolver<T>): Provider<T> =>
    provide("singleton", resolver);

/**
 * An alias for `provide("scoped", ...)`.
 * Creates a transient provider instance,
 * a wrapper around a resolver(factory) for contextual dependency resolution
 * that will take its resolution from a provided scope
 * or create a new one and save it if there is none.
 * If no scope is passed, it will create a new instance on each request.
 * ```ts
 * const getInstance = scoped((context) =>
 *     createInstance(...)
 * )
 *
 * getInstance() !== getInstance()
 * getInstance({ scope }) === getInstance({ scope })
 * ```
 *
 * @param resolver
 * The function that creates an instance using a resolution context.
 *
 * @returns The scoped provider instance.
 */
export const scoped = <T>(resolver: Resolver<T>): Provider<T> =>
    provide("scoped", resolver);
