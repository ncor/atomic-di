import { MockMap } from "./mock-map";
import { Scope } from "./scope";

/**
 * A function that takes a resolution context
 * and returns a value of some type.
 */
export type ResolverFn<T> = (context?: ResolutionContext) => T;

/**
 * A function that returns a value of some type
 * based on a resolution context.
 */
export type Resolver<T> = ResolverFn<T>;

/**
 * A context used by resolvers that defines the behaviour of the resolver
 * with the passed mocks and scope.
 */
export type ResolutionContext = {
    scope?: Scope;
    mocks?: MockMap;
};

/**
 * Makes the resolver function capable of replacing itself
 * with a mock if one is defined in the resolution context.
 */
function mockable<T>(fn: ResolverFn<T>): ResolverFn<T> {
    const instance = (context?: ResolutionContext) => {
        const mock = context?.mocks?.get(instance);
        if (!mock) return fn(context);

        if (!mock.isPartial) return mock.resolver(context);

        const resolution = fn(context);
        const mockResolution = mock.resolver(context);

        if (resolution instanceof Promise && mockResolution instanceof Promise)
            return Promise.all([resolution, mockResolution]).then(([a, b]) =>
                Object.assign(a as object, b),
            ) as T;

        return Object.assign(resolution as object, mockResolution);
    };

    return instance;
};

/**
 * Creates a resolver that creates a new resolution on each call.
 *
 * @example
 * ```ts
 * const getEntity = transient(() => createEntity())
 * getEntity() !== getEntity()
 * ```
 *
 * @param resolver
 * A function that takes a resolution context
 * and returns a value of some type.
 *
 * @returns The transient resolver.
 */
export function transient<T>(fn: ResolverFn<T>): Resolver<T> {
    return mockable(fn);
}

/**
 * Creates a resolver that creates
 * a resolution once and return it on each call.
 *
 * @example
 * ```ts
 * const getEntity = singleton(() => createEntity())
 * getEntity() === getEntity()
 * ```
 *
 * @param fn
 * A function that takes a resolution context
 * and returns a value of some type.
 *
 * @returns The singleton resolver.
 */
export function singleton<T>(fn: ResolverFn<T>): Resolver<T> {
    let resolved = false;
    let resolution: T | undefined;

    const instance = mockable((context) => {
        if (resolved) return resolution!;

        resolution = fn(context);
        resolved = true;

        return resolution;
    });

    return instance;
}

/**
 * Creates a resolver that takes its resolution
 * from a scope or create a new one and save it if there is none.
 * If no scope was passed in a resolution context,
 * it will act as a singleton.
 *
 * @example
 * ```ts
 * const getEntity = scoped(() => createEntity())
 * getEntity() === getEntity()
 * ```
 *
 * @example
 * ```ts
 * const getEntity = scoped(() => createEntity())
 * const scope = createScope()
 * getEntity({ scope }) === getEntity({ scope }) !== getEntity()
 * ```
 *
 * @param fn
 * A function that takes a resolution context
 * and returns a value of some type.
 *
 * @returns The scoped resolver.
 */
export function scoped<T>(fn: ResolverFn<T>): Resolver<T> {
    const singletonFallback = singleton(fn);

    const instance = mockable((context) => {
        if (!context?.scope) return singletonFallback(context);

        const resolution = context.scope.has(instance)
            ? context.scope.get(instance)
            : fn(context);

        context.scope.set(instance, resolution);

        return resolution;
    });

    return instance;
}
