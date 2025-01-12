import { Provider, ResolutionContext } from "./provider";

type ProviderList = Provider<any>[];
type ProviderRecord = Record<string, Provider<any>>;

type InferProviderCollectionResolutions<
    Providers extends ProviderList | ProviderRecord,
> = {
    [K in keyof Providers]: Providers[K] extends Provider<infer T> ? T : never;
};

/**
 * Awaits all promises and wraps the collection in a promise
 * if there'ss at least one `Promise` in the collection,
 * otherwise returns an untouched type.
 */
type AwaitAllValuesInCollection<T extends any[] | Record<any, any>> =
    Promise<any> extends T[keyof T]
        ? Promise<{
              [I in keyof T]: T[I] extends Promise<infer T> ? T : T[I];
          }>
        : T;

/**
 * Calls every provider in a list with a provided resolution context
 * and returns a list of resolutions. Returns a promise of a list
 * of awaited resolutions if there's at least one promise in the resolutions.
 *
 * @param providers - The list of providers.
 * @param context - The resolution context.
 *
 * @returns The list of resolutions.
 */
export const resolveList = <const Providers extends ProviderList>(
    providers: Providers,
    context?: ResolutionContext,
): AwaitAllValuesInCollection<
    InferProviderCollectionResolutions<Providers>
> => {
    const resolutions = providers.map((provider) => provider(context));

    return (
        resolutions.some((resolution) => resolution instanceof Promise)
            ? Promise.all(resolutions)
            : resolutions
    ) as any;
};

/**
 * Calls every provider in a map with a provided resolution context
 * and returns a map with identical keys but with resolutions in values instead.
 * Returns a promise of a map of awaited resolutions if there's at least one
 * promise in the resolutions.
 *
 * @param providers - The map of providers.
 * @param context - The resolution context.
 *
 * @returns The map of resolutions.
 */
export const resolveMap = <const Providers extends ProviderRecord>(
    providers: Providers,
    context?: ResolutionContext,
): AwaitAllValuesInCollection<
    InferProviderCollectionResolutions<Providers>
> => {
    let resolutionMapEntries = Object.entries(providers).map(
        ([key, provider]) => [key, provider(context)],
    );

    if (
        resolutionMapEntries.some(
            ([, resolution]) => resolution instanceof Promise,
        )
    ) {
        return (async () => {
            resolutionMapEntries = await Promise.all(
                resolutionMapEntries.map(async ([key, resolution]) => [
                    key,
                    await resolution,
                ]),
            );

            return Object.fromEntries(resolutionMapEntries);
        })() as any;
    }

    return Object.fromEntries(resolutionMapEntries);
};
