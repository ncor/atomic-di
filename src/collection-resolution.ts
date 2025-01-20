import { ResolutionContext, Resolver } from "./resolver";

type ResolverList = Resolver<any>[];
type ResolverRecord = Record<string, Resolver<any>>;

type InferResolverCollectionResolutions<
    Resolvers extends ResolverList | ResolverRecord,
> = {
    [K in keyof Resolvers]: Resolvers[K] extends Resolver<infer T> ? T : never;
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
 * Calls every resolver in a list with a provided resolution context
 * and returns a list of resolutions. Returns a `Promise` of a list
 * of awaited resolutions if there's at least one `Promise` in the resolutions.
 *
 * @example
 * Only sync resolvers:
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
 * Some resolver is async:
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
 * @param resolvers - The list of resolvers.
 * @param context - The resolution context.
 *
 * @returns The list of resolutions.
 */
export const resolveList = <const Resolvers extends ResolverList>(
    resolvers: Resolvers,
    context?: ResolutionContext,
): AwaitValuesInCollection<InferResolverCollectionResolutions<Resolvers>> => {
    const resolutions = resolvers.map((resolver) => resolver(context));

    const hasPromises = resolutions.some(
        (resolution) => resolution instanceof Promise,
    );

    return (hasPromises ? Promise.all(resolutions) : resolutions) as any;
};

/**
 * Calls every resolver in a map with a provided resolution context
 * and returns a map with identical keys but with resolutions in values instead.
 * Returns a `Promise` of a map of awaited resolutions if there's at least one
 * `Promise` in the resolutions.
 *
 * @example
 * Only sync resolvers:
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
 * Some resolver is async:
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
 * @param resolvers - The map of resolvers.
 * @param context - The resolution context.
 *
 * @returns The map of resolutions.
 */
export const resolveMap = <const Resolvers extends ResolverRecord>(
    resolvers: Resolvers,
    context?: ResolutionContext,
): AwaitValuesInCollection<InferResolverCollectionResolutions<Resolvers>> => {
    const resolutionMapEntries = Object.entries(resolvers).map(
        ([key, resolver]) => [key, resolver(context)],
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
