import { describe, it, expect } from "vitest";

import { createScope } from "../src/scope";
import { createMockMap } from "../src/mock-map";
import {
    transient,
    singleton,
    scoped,
    Resolver,
    ResolutionContext,
} from "../src/provider";
import { resolveList, resolveMap } from "../src/collection-resolution";

describe("provider", () => {
    describe("transient", () => {
        it("should always resolve a new instance", () => {
            let counter = 0;
            const resolver: Resolver<number> = () => counter++;
            const provider = transient(resolver);

            expect(provider()).toBe(0);
            expect(provider()).toBe(1);
            expect(provider()).toBe(2);
        });

        it("should pass context to a resolver", () => {
            const resolver: Resolver<ResolutionContext> = (context) => context!;
            const provider = transient(resolver);
            const context = { scope: createScope(), mocks: createMockMap() };

            expect(provider(context)).toBe(context);
        });
    });

    describe("singleton", () => {
        it("should resolve the same instance on each call", () => {
            let counter = 0;
            const resolver: Resolver<number> = () => counter++;
            const provider = singleton(resolver);
            expect(provider()).toBe(0);
            expect(provider()).toBe(0);
            expect(provider()).toBe(0);
        });

        it("should pass context to a resolver", () => {
            const resolver: Resolver<ResolutionContext> = (context) => context!;
            const provider = singleton(resolver);
            const context = { scope: createScope(), mocks: createMockMap() };

            expect(provider(context)).toBe(context);
        });
    });

    describe("scoped", () => {
        it("should resolve a new instance if no scope is provided", () => {
            let counter = 0;
            const resolver: Resolver<number> = () => counter++;
            const provider = scoped(resolver);

            expect(provider()).toBe(0);
            expect(provider()).toBe(1);
            expect(provider()).toBe(2);
        });

        it("should resolve the same instance within the same scope", () => {
            let counter = 0;
            const resolver: Resolver<number> = () => counter++;
            const provider = scoped(resolver);
            const scope = createScope();
            const context = { scope };

            expect(provider(context)).toBe(0);
            expect(provider(context)).toBe(0);
            expect(provider(context)).toBe(0);
            expect(scope.size).toBe(1);
        });

        it("should resolve different instances in different scopes", () => {
            let counter = 0;
            const resolver: Resolver<number> = () => counter++;
            const provider = scoped(resolver);
            const scope1 = createScope();
            const scope2 = createScope();
            const context1 = { scope: scope1 };
            const context2 = { scope: scope2 };

            expect(provider(context1)).toBe(0);
            expect(provider(context2)).toBe(1);
            expect(scope1.size).toBe(1);
            expect(scope2.size).toBe(1);
        });

        it("should use the same scope across different providers", () => {
            let counter = 0;
            const resolver1: Resolver<number> = () => counter++;
            const resolver2: Resolver<number> = () => counter++;
            const provider1 = scoped(resolver1);
            const provider2 = scoped(resolver2);
            const scope = createScope();
            const context = { scope };

            expect(provider1(context)).toBe(0);
            expect(provider2(context)).toBe(1);
            expect(provider1(context)).toBe(0);
            expect(provider2(context)).toBe(1);
            expect(scope.size).toBe(2);
        });

        it("should pass context to a resolver", () => {
            const resolver: Resolver<ResolutionContext> = (context) => context!;
            const provider = scoped(resolver);
            const scope = createScope();
            const context = { scope, mocks: createMockMap() };

            expect(provider(context)).toBe(context);
        });
    });

    it("should use a mock if present", () => {
        const resolver: Resolver<number> = () => 10;
        const provider = transient(resolver);
        const mock = () => 100;
        const mocks = createMockMap().set(provider, mock);
        const context = { mocks };

        expect(provider(context)).toBe(100);
    });

    it("should use a mock in a singleton provider if present", () => {
        const resolver: Resolver<number> = () => 10;
        const provider = singleton(resolver);
        const mock = () => 100;
        const mocks = createMockMap().set(provider, mock);
        const context = { mocks };

        expect(provider(context)).toBe(100);
        expect(provider()).toBe(10);
    });

    it("should use a mock in a scoped provider if present", () => {
        let counter = 0;
        const resolver: Resolver<number> = () => counter++;
        const provider = scoped(resolver);
        const mock = () => 100;
        const mocks = createMockMap().set(provider, mock);
        const scope = createScope();
        const context = { mocks, scope };

        expect(provider(context)).toBe(100);
        expect(provider(context)).toBe(100);
        expect(provider()).toBe(0);
    });

    it("should use a mock in nested providers", () => {
        const mockValue = { value: "mocked" };
        const mock = () => mockValue;

        const dependencyProvider = transient(() => ({
            value: "real value",
        }));
        const provider = transient((context) => {
            return dependencyProvider(context);
        });

        const mocks = createMockMap().set(dependencyProvider, mock);
        const context = { mocks };

        expect(provider(context)).toBe(mockValue);
    });
});

describe("resolveList", () => {
    it("should resolve a list of providers with context", () => {
        const provider1 = transient(() => 1);
        const provider2 = singleton(() => 2);
        const scope = createScope();
        const context = { scope, mocks: createMockMap() };
        const result = resolveList([provider1, provider2], context);
        expect(result).toEqual([1, 2]);
    });

    it("should resolve a list of providers without context", () => {
        const provider1 = transient(() => 1);
        const provider2 = singleton(() => 2);
        const result = resolveList([provider1, provider2]);
        expect(result).toEqual([1, 2]);
    });

    it("should resolve a list of providers with different types", () => {
        const provider1 = transient(() => 1);
        const provider2 = singleton(() => "2");
        const result = resolveList([provider1, provider2]);
        expect(result).toEqual([1, "2"]);
    });

    it("should resolve a list with promises", async () => {
        const provider1 = transient(async () => 1);
        const provider2 = singleton(async () => 2);
        const result = await resolveList([provider1, provider2]);
        expect(result).toEqual([1, 2]);
    });
    it("should resolve a list with mixed values and promises", async () => {
        const provider1 = transient(() => 1);
        const provider2 = singleton(async () => 2);
        const result = await resolveList([provider1, provider2]);
        expect(result).toEqual([1, 2]);
    });

    it("should use mock providers if provided", async () => {
        const provider1 = transient(() => 1);
        const mock1 = () => 100;
        const provider2 = singleton(async () => 2);
        const mock2 = async () => 200;
        const mocks = createMockMap()
            .set(provider1, mock1)
            .set(provider2, mock2);
        const context = { mocks };
        const result = await resolveList([provider1, provider2], context);
        expect(result).toEqual([100, 200]);
    });
});

describe("resolveMap", () => {
    it("should resolve a map of providers with context", () => {
        const providers = {
            a: transient(() => 1),
            b: singleton(() => 2),
        };
        const scope = createScope();
        const context = { scope, mocks: createMockMap() };
        const result = resolveMap(providers, context);
        expect(result).toEqual({ a: 1, b: 2 });
    });

    it("should resolve a map of providers without context", () => {
        const providers = {
            a: transient(() => 1),
            b: singleton(() => 2),
        };
        const result = resolveMap(providers);
        expect(result).toEqual({ a: 1, b: 2 });
    });

    it("should resolve a map of providers with different types", () => {
        const providers = {
            a: transient(() => 1),
            b: singleton(() => "2"),
        };
        const result = resolveMap(providers);
        expect(result).toEqual({ a: 1, b: "2" });
    });

    it("should resolve a map with promises", async () => {
        const providers = {
            a: transient(async () => 1),
            b: singleton(async () => 2),
        };
        const result = await resolveMap(providers);
        expect(result).toEqual({ a: 1, b: 2 });
    });

    it("should resolve a map with mixed values and promises", async () => {
        const providers = {
            a: transient(() => 1),
            b: singleton(async () => 2),
        };
        const result = await resolveMap(providers);
        expect(result).toEqual({ a: 1, b: 2 });
    });

    it("should use mock providers if provided", async () => {
        const providers = {
            a: transient(() => 1),
            b: singleton(async () => 2),
        };
        const mockA = () => 100;
        const mockB = async () => 200;
        const mocks = createMockMap()
            .set(providers.a, mockA)
            .set(providers.b, mockB);
        const context = { mocks };
        const result = await resolveMap(providers, context);
        expect(result).toEqual({ a: 100, b: 200 });
    });
});
