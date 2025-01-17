import { Provider } from "./provider";

export type Scope = Map<Provider<any>, any>;

export const createScope = (): Scope => new Map();
