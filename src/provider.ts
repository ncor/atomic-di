import { MockMap } from "./mock-map";
import { Scope } from "./scope";

/**
 * A function that returns a value of a particular type
 * with a resolution context being passed to it.
 */
export type Resolver<T> = (context?: ResolutionContext) => T;

/**
 * A function that resolves an instance or a `Promise` of a particular type
 * based on a resolution context passed to it.
 */
export type Provider<T> = Resolver<T> & { __brand: "provider" };

/**
 * A context used by providers to resolve instances
 * based on current scope and mocks.
 */
export type ResolutionContext = {
    scope?: Scope;
    mocks?: MockMap;
};

/**
 * Creating a nominal type value and introducing common functionality.
 */
const createProvider = <T>(resolver: Resolver<T>): Provider<T> => {
    const instance: Resolver<T> = (context) => {
        const maybeMock = context?.mocks?.get(instance);
        if (maybeMock) return maybeMock(context);

        return resolver(context);
    };

    return Object.assign(instance, { __brand: "provider" as const });
};

/**
 * Creates a transient provider that will resolve a new instance on each call.
 *
 * @example
 * ```ts
 * const getThing = transient(() => createThing())
 * getThing() !== getThing()
 * ```
 *
 * @param resolver
 * A function that returns a value of a particular type
 * with a resolution context being passed to it.
 *
 * @returns The transient provider.
 */
export const transient = createProvider;

/**
 * Creates a singleton provider that will resolve an instance once
 * and return it on every call.
 *
 * @example
 * ```ts
 * const getThing = singleton(() => createThing())
 * getThing() === getThing()
 * ```
 *
 * @param resolver
 * A function that returns a value of a particular type
 * with a resolution context being passed to it.
 *
 * @returns The singleton provider.
 */
export const singleton = <T>(resolver: Resolver<T>): Provider<T> => {
    let resolved = false;
    let resolution: T | undefined;

    const instance = createProvider((context) => {
        if (resolved) return resolution!;

        resolution = resolver(context);
        resolved = true;

        return resolution;
    });

    return instance;
};

/**
 * Creates a scoped provider that will take its resolution from a passed scope
 * or create a new one and save it if there is none.
 * If no scope is passed, it will act as a singleton.
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
 * A function that returns a value of a particular type
 * with a resolution context being passed to it.
 *
 * @returns The scoped provider.
 */
export const scoped = <T>(resolver: Resolver<T>): Provider<T> => {
    const singletonFallback = singleton(resolver);

    const instance = createProvider((context) => {
        if (!context?.scope) return singletonFallback(context);

        const resolution = context.scope.has(instance)
            ? context.scope.get(instance)
            : resolver(context);
        context.scope.set(instance, resolution);

        return resolution;
    });

    return instance;
};
