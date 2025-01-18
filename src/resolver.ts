import { Mocks } from "./mocks";
import { Scope } from "./scope";

/**
 * A function that takes a resolution context
 * and returns a value of some type.
 */
export type ResolverFn<T> = (context?: ResolutionContext) => T;

/**
 * A lifetime of the resolution, which is included in the resolver type.
 * This is necessary in order to provide mocks with the same lifetime
 * as the original.
 */
export type ResolutionLifetime = "transient" | "singleton" | "scoped";

/**
 * A function that returns a value of some type
 * based on a resolution context.
 */
export type Resolver<T, L extends ResolutionLifetime> = ResolverFn<T> & {
    lifetime: L;
};

/**
 * A context used by resolvers that defines the behavior of the resolver
 * with the passed mocks and scope.
 */
export type ResolutionContext = {
    scope?: Scope;
    mocks?: Mocks;
};

/**
 * Makes the resolver function capable of replacing itself
 * with a mock if one is defined in the resolution context.
 */
const mockable = <T>(fn: ResolverFn<T>): ResolverFn<T> => {
    const instance = (context?: ResolutionContext) => {
        const mock = context?.mocks?.get(instance);
        if (!mock) return fn(context);

        if (!mock.isPartial) return mock.provider(context) as T;

        const resolution = fn(context);
        const mockResolution = mock.provider(context);

        if (resolution instanceof Promise || mockResolution instanceof Promise)
            return Promise.all([resolution, mockResolution]).then(([a, b]) =>
                Object.assign(a as object, b),
            ) as T;

        return Object.assign(resolution as object, mockResolution) as T;
    };

    return instance;
};

/**
 * Creates a resolver that creates a new instance on each call.
 *
 * @example
 * ```ts
 * const getThing = transient(() => createThing())
 * getThing() !== getThing()
 * ```
 *
 * @param resolver
 * A function that returns a value of some type
 * based on a resolution context.
 *
 * @returns The transient resolver.
 */
export const transient = <T>(fn: ResolverFn<T>): Resolver<T, "transient"> =>
    Object.assign(mockable(fn), {
        lifetime: "transient" as const,
    });

/**
 * Creates a resolver that creates
 * an instance once and return it on each call.
 *
 * @example
 * ```ts
 * const getThing = singleton(() => createThing())
 * getThing() === getThing()
 * ```
 *
 * @param fn
 * A function that returns a value of some type
 * based on a resolution context.
 *
 * @returns The singleton resolver.
 */
export const singleton = <T>(fn: ResolverFn<T>): Resolver<T, "singleton"> => {
    let resolved = false;
    let resolution: T | undefined;

    const instance = mockable((context) => {
        if (resolved) return resolution!;

        resolution = fn(context);
        resolved = true;

        return resolution;
    });

    return Object.assign(instance, {
        lifetime: "singleton" as const,
    });
};

/**
 * Creates a resolver that takes its resolution
 * from a scope or create a new one and save it if there is none.
 * If no scope was passed in a resolution context,
 * it will act as a singleton.
 *
 * @example
 * ```ts
 * const getThing = scoped(() => createThing())
 * getThing() === getThing()
 * ```
 *
 * @example
 * ```ts
 * const getThing = scoped(() => createThing())
 * const scope = createScope()
 * getThing({ scope }) === getThing({ scope }) !== getThing()
 * ```
 *
 * @param fn
 * A function that returns a value of some type
 * based on a resolution context.
 *
 * @returns The scoped provider.
 */
export const scoped = <T>(fn: ResolverFn<T>): Resolver<T, "scoped"> => {
    const singletonFallback = singleton(fn);

    const instance = mockable((context) => {
        if (!context?.scope) return singletonFallback(context);

        const resolution = context.scope.has(instance)
            ? context.scope.get(instance)
            : fn(context);

        context.scope.set(instance, resolution);

        return resolution;
    });

    return Object.assign(instance, {
        lifetime: "scoped" as const,
    });
};
