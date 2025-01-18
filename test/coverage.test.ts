import { describe, it, expect, assert, vi } from "vitest";

import { createScope } from "../src/scope";
import { createMockMap } from "../src/mock-map";
import { resolveList, resolveMap } from "../src/collection-resolution";
import { scoped, singleton, transient } from "../src";

describe("scope", () => {
    it("should create a scope", () => {
        const scope = createScope();

        expect(scope).not.toBe(undefined);
        expect(scope).toBeInstanceOf(Map);
    });
});

describe("mock map", () => {
    it("should create a mock map", () => {
        const mocks = createMockMap();

        expect(mocks).not.toBe(undefined);
    });

    it("should correctly register and get a mock", () => {
        const getRed = transient(() => "red");
        const getBlue = transient(() => "blue");
        const mocks = createMockMap().mock(getRed, getBlue);
        const mock = mocks.get(getRed)!;

        expect(mock.resolver).toBe(getBlue);
        expect(mock.isPartial).toBe(false);
    });

    it("should correctly register and get a partial mock", () => {
        const getRed = transient(() => ({ value: "red" }));
        const getBlue = transient(() => ({ value: "blue" }));
        const mocks = createMockMap().mockPartially(getRed, getBlue);
        const mock = mocks.get(getRed)!;

        expect(mock.resolver).toBe(getBlue);
        expect(mock.isPartial).toBe(true);
    });

    it("should return undefined if mock doesn't exist", () => {
        const getRed = transient(() => ({ value: "red" }));
        const getBlue = transient(() => ({ value: "blue" }));
        const mocks = createMockMap().mockPartially(getRed, getBlue);
        const mock = mocks.get(transient(() => {}))!;

        expect(mock).toBe(undefined);
    });
});

describe("resolver", () => {
    describe("transient", () => {
        it("should create a transient resolver", () => {
            const getRed = transient(() => "red");

            expect(getRed).not.toBe(undefined);
            expect(getRed).toBeTypeOf("function");
        });

        it("should create a new resolution on each call", () => {
            const redResolverFn = vi.fn(() => ({ value: "red" }));
            const getRed = transient(redResolverFn);
            const red1 = getRed();
            const red2 = getRed();

            expect(red1).toStrictEqual({ value: "red" });
            expect(red1).not.toBe(red2);
            expect(redResolverFn).toBeCalledTimes(2);
        });
    });

    describe("singleton", () => {
        it("should create a singleton resolver", () => {
            const getRed = singleton(() => "red");

            expect(getRed).not.toBe(undefined);
            expect(getRed).toBeTypeOf("function");
        });

        it("should create a resolution once and return in on each call", () => {
            const redResolverFn = vi.fn(() => ({ value: "red" }));
            const getRed = singleton(redResolverFn);
            const red1 = getRed();
            const red2 = getRed();

            expect(red1).toStrictEqual({ value: "red" });
            expect(red1).toBe(red2);
            expect(redResolverFn).toBeCalledTimes(1);
        });
    });

    describe("scoped", () => {
        it("should create a scoped resolver", () => {
            const getRed = scoped(() => "red");

            expect(getRed).not.toBe(undefined);
            expect(getRed).toBeTypeOf("function");
        });

        it("should create a resolution and save it in scope", () => {
            const redResolverFn = vi.fn(() => ({ value: "red" }));
            const getRed = scoped(redResolverFn);
            const scope = createScope();
            const red = getRed({ scope });

            expect(red).toStrictEqual({ value: "red" });
            expect(scope.get(getRed)).toBe(red);
            expect(redResolverFn).toBeCalledTimes(1);
        });

        it("should retrieve existing resolution from a scope", () => {
            const redResolverFn = vi.fn(() => ({ value: "red" }));
            const getRed = scoped(redResolverFn);
            const scope = createScope();
            const red1 = getRed({ scope });
            const red2 = getRed({ scope });

            expect(red1).toBe(red2);
            expect(scope.get(getRed)).toBe(red1);
            expect(redResolverFn).toBeCalledTimes(1);
        });

        it("should act as a singleton if no scope was passed", () => {
            const redResolverFn = vi.fn(() => ({ value: "red" }));
            const getRed = scoped(redResolverFn);
            const red1 = getRed();
            const red2 = getRed();

            expect(red1).toBe(red2);
            expect(redResolverFn).toBeCalledTimes(1);
        });
    });

    describe("mocking", () => {
        it("should mock itself", () => {
            const redResolverFn = vi.fn(() => "red");
            const getRed = transient(redResolverFn);
            const getBlue = transient(() => "blue");
            const mocks = createMockMap().mock(getRed, getBlue);
            const resolution = getRed({ mocks });

            expect(resolution).toBe("blue");
            expect(redResolverFn).toBeCalledTimes(0);
        });

        it("should partially mock itself", () => {
            const redResolverFn = vi.fn(() => ({
                value: "red",
                origin: "red",
            }));
            const getRed = transient(redResolverFn);
            const getBlue = transient(() => ({ value: "blue" }));
            const mocks = createMockMap().mockPartially(getRed, getBlue);
            const resolution = getRed({ mocks });

            expect(resolution).toStrictEqual({ value: "blue", origin: "red" });
            expect(redResolverFn).toBeCalledTimes(1);
        });

        it("should partially mock own resolution promise", async () => {
            const redResolverFn = vi.fn(async () => ({
                value: "red",
                origin: "red",
            }));
            const getRed = transient(redResolverFn);
            const getBlue = transient(async () => ({ value: "blue" }));
            const mocks = createMockMap().mockPartially(getRed, getBlue);
            const resolution = await getRed({ mocks });

            expect(resolution).toStrictEqual({ value: "blue", origin: "red" });
            expect(redResolverFn).toBeCalledTimes(1);
        });
    });
});

describe("collection resolution", () => {
    describe("list resolution", () => {
        it("should resolve a list with a common context", () => {
            const getRed = scoped(() => "red");
            const getBlue = scoped(() => "blue");
            const scope = createScope();
            const resolutions = resolveList([getRed, getBlue], { scope });

            expect(resolutions).toStrictEqual(["red", "blue"]);
            expect(scope.get(getRed)).toBe("red");
            expect(scope.get(getBlue)).toBe("blue");
        });

        it("should return a promise of a list of awaited resolutions", async () => {
            const getRed = scoped(() => "red");
            const getBlue = scoped(async () => "blue");
            const scope = createScope();
            const resolutions = await resolveList([getRed, getBlue], { scope });

            expect(resolutions).toStrictEqual(["red", "blue"]);
            expect(scope.get(getRed)).toBe("red");
            expect(await scope.get(getBlue)).toBe("blue");
        });
    });

    describe("map resolution", () => {
        it("should resolve a map with a common context", () => {
            const getRed = scoped(() => "red");
            const getBlue = scoped(() => "blue");
            const scope = createScope();
            const resolutions = resolveMap(
                { red: getRed, blue: getBlue },
                { scope },
            );

            expect(resolutions).toStrictEqual({ red: "red", blue: "blue" });
            expect(scope.get(getRed)).toBe("red");
            expect(scope.get(getBlue)).toBe("blue");
        });

        it("should return a promise of a map of awaited resolutions", async () => {
            const getRed = scoped(() => "red");
            const getBlue = scoped(async () => "blue");
            const scope = createScope();
            const resolutions = await resolveMap(
                { red: getRed, blue: getBlue },
                { scope },
            );

            expect(resolutions).toStrictEqual({ red: "red", blue: "blue" });
            expect(scope.get(getRed)).toBe("red");
            expect(await scope.get(getBlue)).toBe("blue");
        });
    });
});
