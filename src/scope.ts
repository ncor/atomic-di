import { Provider, ResolutionContext, Resolver } from "./provider";

export type Scope = {
    resolve<T>(provider: Provider<T>, context?: ResolutionContext): T;
};

export const createScope = (): Scope => {
    const map = new Map<Resolver<any>, any>();

    return {
        resolve(provider, context) {
            const resolution = map.has(provider)
                ? map.get(provider)
                : provider(context);

            map.set(provider, resolution);

            return resolution;
        },
    };
};
