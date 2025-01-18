import { Resolver } from "./resolver";

export type Scope = Map<Resolver<any>, any>;

export const createScope = (): Scope => new Map();
