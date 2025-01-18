import { Resolver } from "./resolver";

/**
 * A `Map` of resolvers to their resolutions.
 * Is passed in the resolution context and used by scoped resolvers
 * to retrieve or save resolution within it.
 */
export type Scope = Map<Resolver<any>, any>;

/**
 * Creates a `Map` of providers to their instances.
 * Is passed in the resolution context and used by scoped resolvers
 * to retrieve or save resolution within it.
 *
 * @example
 * ```ts
 * const requestScope = createScope()
 *
 * app.use(() => {
 *     const db = getDb({ scope: requestScope })
 * })
 * ```
 *
 * @returns The map.
 */
export const createScope = (): Scope => new Map();
