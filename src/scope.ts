import { Resolver } from "./provider";

/**
 * Creates a map of providers to their instances
 * that is then passed to a provider call in a resolution context object
 * to resolve instances of scoped providers within it.
 */
export type Scope = Map<Resolver<any>, any>;

/**
 * Creates a map of providers to their instances
 * that is then passed to a provider call in a resolution context object
 * to resolve instances of scoped providers within it.
 *
 * @returns The map instance.
 */
export const createScope = (): Scope => new Map();
