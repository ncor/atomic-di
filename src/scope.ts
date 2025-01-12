import { Provider } from "./provider";

/**
 * A map of providers to their instances.
 *
 * Passed to a provider call in a resolution context object
 * to resolve instances of scoped providers within it.
 * ```ts
 * const scope = createScope()
 * provider({ scope })
 * ```
 */
export type Scope = Map<Provider<any>, any>;

/**
 * Creates a scope instance.
 *
 * Scope is passed to a provider call in a resolution context object
 * to resolve instances of scoped providers within it.
 * ```ts
 * const scope = createScope()
 * provider({ scope })
 * ```
 *
 * @returns The scope instance.
 */
export const createScope = (): Scope => new Map();
