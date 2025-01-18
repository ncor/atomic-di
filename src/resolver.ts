import { Mocks } from "./mocks";
import { createScope, Scope } from "./scope";

/**
 * A function that returns a value of some type
 * based on a resolution context.
 */
export type Resolver<T> = (context?: ResolutionContext) => T;

/**
 * A context used by resolvers that defines the behavior of the resolver
 * with the passed mocks and scope.
 */
export type ResolutionContext = {
    scope?: Scope;
    mocks?: Mocks;
};

/**
 * A scope that is used as a fallback scope for scoped providers.
 */
const globalScope = createScope();

/**
 * Creates a resolver that replaces its implementation
 * with a mock if one is defined in the resolution context.
 */
const mockable = <T>(resolver: Resolver<T>): Resolver<T> => {
    const instance = (context?: ResolutionContext) => {
        const mock = context?.mocks?.get(instance);
        if (!mock) return resolver(context);

        if (!mock.isPartial) return mock.provider(context) as T;

        const resolution = resolver(context);
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
 * Creates a mockable resolver.
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
export const transient = mockable;

/**
 * Creates a mockable resolver that resolves
 * an instance once and return it on every call.
 *
 * @example
 * ```ts
 * const getThing = singleton(() => createThing())
 * getThing() === getThing()
 * ```
 *
 * @param resolver
 * A function that returns a value of some type
 * based on a resolution context.
 *
 * @returns The singleton resolver.
 */
export const singleton = <T>(resolver: Resolver<T>): Resolver<T> => {
    let resolved = false;
    let resolution: T | undefined;

    const instance = mockable((context) => {
        if (resolved) return resolution!;

        resolution = resolver(context);
        resolved = true;

        return resolution;
    });

    return instance;
};

/**
 * Creates a mockable resolver that takes its resolution
 * from a scope or create a new one and save it if there is none.
 * If no scope was passed in a resolution context,
 * it will use a global scope.
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
 * @param resolver
 * A function that returns a value of some type
 * based on a resolution context.
 *
 * @returns The scoped provider.
 */
export const scoped = <T>(resolver: Resolver<T>): Resolver<T> => {
    const instance = mockable((context) => {
        const scope = context?.scope || globalScope;

        const resolution = scope.has(instance)
            ? scope.get(instance)
            : resolver(context);

        scope.set(instance, resolution);

        return resolution;
    });

    return instance;
};
