import { ResolverFn } from "./resolver";

export type Scope = Map<ResolverFn<any>, any>;

export const createScope = (): Scope => new Map();
