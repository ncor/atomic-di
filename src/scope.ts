import { Provider } from "./provider";

/**
 * A map of providers to their instances.
 * Passed to the provider call to resolve instances
 * of scoped providers within it.
 */
export type Scope = WeakMap<Provider<any>, any>;

/**
 * Creates a new scope, map of providers to their instances.
 * Scope is passed to the provider call to resolve instances
 * of scoped providers within it.
 *
 * @returns A new scope.
 */
export const createScope = (): Scope => new WeakMap();
