import { Resolver } from "./provider";

/**
 * A `Map` of providers to their instances
 * that is then passed to a provider call in a resolution context object
 * to resolve instances of scoped providers within it.
 */
export type Scope = Map<Resolver<any>, any>;

/**
 * Creates a `Map` of providers to their instances
 * that is then passed to a provider call in a resolution context object
 * to resolve instances of scoped providers within it.
 *
 * @example
 * ```ts
 * const requestScope = createScope()
 *
 * app.use(() => {
 *     const db = getDb({ scope: requestScope })
 *     // ...
 * })
 * ```
 *
 * @returns The map instance.
 */
export const createScope = (): Scope => new Map();
