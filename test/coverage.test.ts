import { describe, it, expect } from "vitest";
import {
    transient,
    singleton,
    scoped,
    createScope,
    select,
    createMockMap,
} from "../src";

describe("provide", () => {
    describe("transient", () => {
        it("should create a new instance on every call", () => {
            const provider = transient(() => ({ value: Math.random() }));
            const instance1 = provider();
            const instance2 = provider();

            expect(instance1).not.toBe(instance2);
            expect(instance1.value).not.toBe(instance2.value);
        });
    });

    describe("singleton", () => {
        it("should create only one instance", () => {
            const provider = singleton(() => ({ value: Math.random() }));
            const instance1 = provider();
            const instance2 = provider();

            expect(instance1).toBe(instance2);
        });

        it("should pass the use function into the resolver", () => {
            const dependencyProvider = singleton(() => "dep");
            const provider = singleton(
                (use) => `test: ${use(dependencyProvider)}`,
            );
            expect(provider()).toBe("test: dep");
        });

        it("should only ever resolve a singleton once, even when nested", () => {
            let dependencyValue = 0;
            const dependencyProvider = singleton(() => {
                dependencyValue++;
                return dependencyValue;
            });

            const provider = singleton((use) => {
                return use(dependencyProvider) + use(dependencyProvider);
            });

            expect(provider()).toBe(2);
            expect(dependencyValue).toBe(1);
            expect(provider()).toBe(2);
            expect(dependencyValue).toBe(1);
        });
    });

    describe("scoped", () => {
        it("should create a new instance per scope", () => {
            const provider = scoped(() => ({ value: Math.random() }));
            const scope1 = createScope();
            const scope2 = createScope();

            const instance1 = provider(scope1);
            const instance2 = provider(scope1);
            const instance3 = provider(scope2);
            const instance4 = provider(createScope());

            expect(instance1).toBe(instance2);
            expect(instance1).not.toBe(instance3);
            expect(instance1).not.toBe(instance4);
        });

        it("should pass the use function into the resolver", () => {
            const dependencyProvider = singleton(() => "dep");
            const provider = scoped(
                (use) => `test: ${use(dependencyProvider)}`,
            );
            const scope = createScope();
            expect(provider(scope)).toBe("test: dep");
        });

        it("should resolve dependencies correctly within a scope", () => {
            let dependencyValue = 0;
            const dependencyProvider = scoped(() => {
                dependencyValue++;
                return dependencyValue;
            });

            const provider = scoped((use) => {
                return use(dependencyProvider) + use(dependencyProvider);
            });
            const scope = createScope();
            expect(provider(scope)).toBe(2);
            expect(dependencyValue).toBe(1);
            expect(provider(scope)).toBe(2);
            expect(dependencyValue).toBe(1);

            expect(provider(createScope())).toBe(4);
            expect(dependencyValue).toBe(2);
        });
    });
});

describe("swap", () => {
    it("should swap a dependency provider", () => {
        const dependencyProvider = singleton(() => "original");
        const replacementProvider = singleton(() => "replacement");

        const provider = singleton((use) => use(dependencyProvider));
        const swappedProvider = provider.mock(
            dependencyProvider,
            replacementProvider,
        );

        expect(provider()).toBe("original");
        expect(swappedProvider()).toBe("replacement");
    });

    it("should allow multiple swaps", () => {
        const dep1 = singleton(() => "original1");
        const dep2 = singleton(() => "original2");
        const replacement1 = singleton(() => "replacement1");
        const replacement2 = singleton(() => "replacement2");

        const provider = singleton((use) => `${use(dep1)} - ${use(dep2)}`);

        const swappedProvider = provider
            .mock(dep1, replacement1)
            .mock(dep2, replacement2);

        expect(provider()).toBe("original1 - original2");
        expect(swappedProvider()).toBe("replacement1 - replacement2");
    });

    it("should not mutate existing providers", () => {
        const dependencyProvider = singleton(() => "original");
        const replacementProvider = singleton(() => "replacement");
        const provider = singleton((use) => use(dependencyProvider));

        const swappedProvider = provider.mock(
            dependencyProvider,
            replacementProvider,
        );

        expect(provider()).toBe("original");
        expect(swappedProvider()).toBe("replacement");
        expect(provider()).toBe("original"); // original unchanged
    });

    it("should use swapContext for nested provider resolution", () => {
        const dep1 = singleton(() => "original1");
        const dep2 = singleton(() => "original2");
        const replacement1 = singleton(() => "replacement1");

        const provider = transient((use) => `${use(dep1)} - ${use(dep2)}`);

        const swapContext = createMockMap();
        const newSwapContext = swapContext.add(dep1, replacement1);
        expect(provider(undefined, newSwapContext)).toBe(
            "replacement1 - original2",
        );

        expect(provider()).toBe("original1 - original2");
    });
});

describe("select", () => {
    it("should resolve all providers", () => {
        const dep1 = singleton(() => "dep1");
        const dep2 = singleton(() => "dep2");

        const selection = select({ dep1, dep2 });
        const resolved = selection();

        expect(resolved).toEqual({ dep1: "dep1", dep2: "dep2" });
    });

    it("should allow dependencies to resolve other dependencies", () => {
        const dep1 = singleton(() => "dep1");
        const dep2 = singleton((use) => `dep2: ${use(dep1)}`);

        const selection = select({ dep1, dep2 });
        const resolved = selection();

        expect(resolved).toEqual({ dep1: "dep1", dep2: "dep2: dep1" });
    });

    it("should resolve all providers within a scope", () => {
        const dep1 = scoped(() => ({ value: Math.random() }));
        const dep2 = scoped(() => ({ value: Math.random() }));

        const selection = select({ dep1, dep2 });
        const scope = createScope();

        const resolved1 = selection(scope);
        const resolved2 = selection(scope);

        expect(resolved1.dep1).toBe(resolved2.dep1);
        expect(resolved1.dep2).toBe(resolved2.dep2);
    });

    it("should allow swapping dependencies in the selection", () => {
        const dep1 = singleton(() => "dep1");
        const dep2 = singleton(() => "dep2");
        const replacement1 = singleton(() => "replacement1");

        const selection = select({ dep1, dep2 });

        const swappedSelection = selection.mock(dep1, replacement1);
        expect(selection()).toEqual({ dep1: "dep1", dep2: "dep2" });
        expect(swappedSelection()).toEqual({
            dep1: "replacement1",
            dep2: "dep2",
        });
    });

    it("should allow swapping dependencies in the selection when they resolve nested deps", () => {
        const dep1 = singleton(() => "dep1");
        const dep2 = singleton((use) => `dep2 ${use(dep1)}`);

        const replacement1 = singleton(() => "replacement1");

        const selection = select({ dep1, dep2 });

        const swappedSelection = selection.mock(dep1, replacement1);
        expect(selection()).toEqual({ dep1: "dep1", dep2: "dep2 dep1" });
        expect(swappedSelection()).toEqual({
            dep1: "replacement1",
            dep2: "dep2 replacement1",
        });
    });

    it("should use swapContext for nested provider resolution", () => {
        const dep1 = singleton(() => "original1");
        const dep2 = singleton(() => "original2");
        const replacement1 = singleton(() => "replacement1");

        const selection = select({ dep1, dep2 });

        const swapContext = createMockMap();
        const newSwapContext = swapContext.add(dep1, replacement1);
        expect(selection(undefined, newSwapContext)).toEqual({
            dep1: "replacement1",
            dep2: "original2",
        });
        expect(selection()).toEqual({ dep1: "original1", dep2: "original2" });
    });
});

describe("swap context", () => {
    it("should register and resolve swaps", () => {
        const dep1 = singleton(() => "original1");
        const replacement1 = singleton(() => "replacement1");

        const swapContext = createMockMap();
        const newSwapContext = swapContext.add(dep1, replacement1);

        expect(newSwapContext.map(dep1)()).toBe("replacement1");
        expect(swapContext.map(dep1)()).toBe("original1");
    });

    it("should apply another swap context", () => {
        const dep1 = singleton(() => "original1");
        const dep2 = singleton(() => "original2");
        const replacement1 = singleton(() => "replacement1");
        const replacement2 = singleton(() => "replacement2");

        const swapContext1 = createMockMap();
        const newSwapContext1 = swapContext1.add(dep1, replacement1);

        const swapContext2 = createMockMap();
        const newSwapContext2 = swapContext2.add(dep2, replacement2);

        const combinedContext = newSwapContext1.apply(newSwapContext2);

        expect(combinedContext.map(dep1)()).toBe("replacement1");
        expect(combinedContext.map(dep2)()).toBe("replacement2");
    });

    it("should apply another swap context when there are conflicts", () => {
        const dep1 = singleton(() => "original1");
        const replacement1 = singleton(() => "replacement1");
        const replacement2 = singleton(() => "replacement2");

        const swapContext1 = createMockMap();
        const newSwapContext1 = swapContext1.add(dep1, replacement1);

        const swapContext2 = createMockMap();
        const newSwapContext2 = swapContext2.add(dep1, replacement2);

        const combinedContext = newSwapContext1.apply(newSwapContext2);

        expect(combinedContext.map(dep1)()).toBe("replacement2");

        const combinedContext2 = newSwapContext2.apply(newSwapContext1);

        expect(combinedContext2.map(dep1)()).toBe("replacement1");
    });
});
