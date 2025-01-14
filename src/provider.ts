import { MockMap } from "./mock-map";
import { Scope } from "./scope";

/**
 * A function that returns a value of a particular type
 * with a resolution context being passed to it.
 */
export type Resolver<T> = (context?: ResolutionContext) => T;

/**
 * A function that resolves an instance or a `Promsie` of a particular type
 * based on a resolution context passed to it.
 */
export type Provider<T> = Resolver<T>;

/**
 * A context used by providers to resolve instances
 * based on current scope and mocks.
 */
export type ResolutionContext = {
    scope?: Scope;
    mocks?: MockMap;
};

/**
 * Creates a transient provider that will resolve a new instance on each call.
 *
 * @param resolver
 * A function that returns a value of a particular type
 * with a resolution context being passed to it.
 * A resolution context passed to it must be passed to all calls to other providers.
 *
 * @returns The transient provider.
 */
export const transient = <T>(resolver: Resolver<T>): Provider<T> => {
    const instance: Resolver<T> = (context) => {
        const maybeMock = context?.mocks?.get(instance);
        if (maybeMock) return maybeMock(context);

        return resolver(context);
    };

    return instance;
};

/**
 * Creates a singleton provider that will resolve an instance once
 * and return it on every call.
 *
 * @param resolver
 * A function that returns a value of a particular type
 * with a resolution context being passed to it.
 * A resolution context passed to it must be passed to all calls to other providers.
 *
 * @returns The singleton provider.
 */
export const singleton = <T>(resolver: Resolver<T>): Provider<T> => {
    let resolved = false;
    let resolution: T | undefined;

    const instance: Resolver<T> = (context) => {
        const maybeMock = context?.mocks?.get(instance);
        if (maybeMock) return maybeMock(context);

        if (resolved) return resolution!;

        resolution = resolver(context);
        resolved = true;

        return resolution;
    };

    return instance;
};

/**
 * Creates a scoped provider that will take its resolution from a passed scope
 * or create a new one and save it if there is none.
 * If no scope is passed, it will create a new instance on each call.
 *
 * @param resolver
 * A function that returns a value of a particular type
 * with a resolution context being passed to it.
 * A resolution context passed to it must be passed to all calls to other providers.
 *
 * @returns The scoped provider.
 */
export const scoped = <T>(resolver: Resolver<T>): Provider<T> => {
    const instance: Resolver<T> = (context) => {
        const maybeMock = context?.mocks?.get(instance);
        if (maybeMock) return maybeMock(context);

        if (!context?.scope) return resolver(context);

        const resolution = context.scope.has(resolver)
            ? context.scope.get(resolver)
            : resolver(context);
        context.scope.set(resolver, resolution);

        return resolution;
    };

    return instance;
};
