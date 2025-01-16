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
type AwaitValuesInCollection<T extends any[] | Record<any, any>> =
    Promise<any> extends T[keyof T]
        ? Promise<{
              [I in keyof T]: T[I] extends Promise<infer T> ? T : T[I];
          }>
        : T;

/**
 * Calls every provider in a list with a provided resolution context
 * and returns a list of resolutions. Returns a `Promise` of a list
 * of awaited resolutions if there's at least one `Promise` in the resolutions.
 *
 * @example
 * Only sync providers:
 * ```ts
 * const getA = scoped(() => createA())
 * const getB = scoped(() => createB())
 * const getC = scoped(() => createC())
 *
 * const scope = createScope()
 * const resolutions = resolveList(
 *     [getA, getB, getC],
 *     { scope }
 * )
 *
 * resolutions == [
 *     getA({ scope }),
 *     getB({ scope }),
 *     getC({ scope })
 * ]
 * ```
 *
 * @example
 * Some provider is async:
 * ```ts
 * const getA = scoped(() => createA())
 * const getB = scoped(async () => await createB())
 * const getC = scoped(() => createC())
 *
 * const scope = createScope()
 * const resolutions = resolveList(
 *     [getA, getB, getC],
 *     { scope }
 * )
 *
 * resolutions == [
 *     getA({ scope }),
 *     await getB({ scope }),
 *     getC({ scope })
 * ]
 * ```
 *
 * @param providers - The list of providers.
 * @param context - The resolution context.
 *
 * @returns The list of resolutions.
 */
export const resolveList = <const Providers extends ProviderList>(
    providers: Providers,
    context?: ResolutionContext,
): AwaitValuesInCollection<
    InferProviderCollectionResolutions<Providers>
> => {
    const resolutions = providers.map((provider) => provider(context));

    const hasPromises = resolutions.some(
        (resolution) => resolution instanceof Promise,
    );

    return (hasPromises ? Promise.all(resolutions) : resolutions) as any;
};

/**
 * Calls every provider in a map with a provided resolution context
 * and returns a map with identical keys but with resolutions in values instead.
 * Returns a `Promise` of a map of awaited resolutions if there's at least one
 * `Promise` in the resolutions.
 *
 * @example
 * Only sync providers:
 * ```ts
 * const getA = scoped(() => createA())
 * const getB = scoped(() => createB())
 * const getC = scoped(() => createC())
 *
 * const scope = createScope()
 * const resolutions = resolveMap(
 *     { a: getA, b: getB, c: getC },
 *     { scope }
 * )
 *
 * resolutions == {
 *     a: getA({ scope }),
 *     b: getB({ scope }),
 *     c: getC({ scope })
 * }
 * ```
 *
 * @example
 * Some provider is async:
 * ```ts
 * const getA = scoped(() => createA())
 * const getB = scoped(async () => await createB())
 * const getC = scoped(() => createC())
 *
 * const scope = createScope()
 * const resolutions = await resolveMap(
 *     { a: getA, b: getB, c: getC },
 *     { scope }
 * )
 *
 * resolutions == {
 *     a: getA({ scope }),
 *     b: await getB({ scope }),
 *     c: getC({ scope })
 * }
 * ```
 *
 * @param providers - The map of providers.
 * @param context - The resolution context.
 *
 * @returns The map of resolutions.
 */
export const resolveMap = <const Providers extends ProviderRecord>(
    providers: Providers,
    context?: ResolutionContext,
): AwaitValuesInCollection<
    InferProviderCollectionResolutions<Providers>
> => {
    const resolutionMapEntries = Object.entries(providers).map(
        ([key, provider]) => [key, provider(context)],
    );

    const hasPromises = resolutionMapEntries.some(
        ([, resolution]) => resolution instanceof Promise,
    );

    if (hasPromises) {
        return (async () => {
            const awaitedEntries = await Promise.all(
                resolutionMapEntries.map(async ([key, resolution]) => [
                    key,
                    await resolution,
                ]),
            );
            return Object.fromEntries(awaitedEntries);
        })() as any;
    }

    return Object.fromEntries(resolutionMapEntries);
};
