# atomic-di

> **This is not an IoC container or a service locator.**

This library provides a set of tools that implement missing features such as lifetimes, scopes and mocking in a pure factory-based dependency injection.

### Key features

-   **Small & fast.** The usage is based on the use of a thin, performant abstraction that wraps factories, adding a couple of operations needed for resolution in a dynamic context.
-   **Transparent.** All the logic for creating instances is written by the developer himself.
-   **Non-invasive.** Does not require adding decorators, registrations or any additional logic to the business logic of the application.
-   **Atomic.** There's no global container. The creation of instances occurs in factories that can be shared among themselves.

# Installation

You can use any package manager.

```bash
npm add atomic-di
```

```bash
npx jsr add @ensi/di
```

# Usage

Not written yet.

# API

## `Provider`

```ts
type Provider<T> = (context?: ResolutionContext) => T;
```

A function wrapper around the [resolver](#Resolver)(factory) for contextual dependency resolution. Resolves an instance by calling a resolver with an **optional** [resolution context](#ResolutionContext) that will be propagated throughout a dependency tree. Can act as a transient, singleton or scoped, which is [determined by the lifetime](#Lifetime) at creation.

```ts
provider({ scope, mocks });
```

When passing a [scope](#Scope) it will try to get an instance from it or create a new one and put it there.

When passing [mocks](#MockMap), it will try to get its own mock version and if there is one, it will use it instead of itself.

### `provide`

```ts
function provide<T>(lifetime: Lifetime, resolver: Resolver<T>): Provider<T>;
```

Creates a provider instance.

-   `lifetime`: A resolution [lifetime](#Lifetime).
-   `resolver`: A function that creates an instance using a [resolution context](#ResolutionContext). If the function calls other providers, the context **must** be passed to their calls.

```ts
const getInstance = provide("transient", (context) =>
    createInstance(getOtherInstance(context)),
);
```

### `transient`

```ts
function transient<T>(resolver: Resolver<T>): Provider<T>;
```

An alias for [provide](#provide) with `"transient"` lifetime. Creates a [transient](#Lifetime) provider instance.

```ts
const getInstance = transient((context) =>
    createInstance(...)
)

getInstance() !== getInstance()
```

### `singleton`

```ts
function singleton<T>(resolver: Resolver<T>): Provider<T>;
```

An alias for [provide](#provide) with `"singleton"` lifetime. Creates a [singleton](#Lifetime) provider instance.

```ts
const getInstance = singleton((context) =>
    createInstance(...)
)

getInstance() === getInstance()
```

### `scoped`

```ts
function scoped<T>(resolver: Resolver<T>): Provider<T>;
```

An alias for [provide](#provide) with `"scoped"` lifetime. Creates a [scoped](#Lifetime) provider instance.

```ts
const getInstance = scoped((context) =>
    createInstance(...)
)

getInstance() !== getInstance()
getInstance({ scope }) === getInstance({ scope })
```

## `Resolver`

```ts
type Resolver<T> = (context?: ResolutionContext) => T;
```

A function that creates an instance using a [resolution context](#ResolutionContext).

## `Lifetime`

```ts
type Lifetime = "transient" | "singleton" | "scoped";
```

A resolution lifetime. Passed when [creating a provider](#provide) to determine its behaviour.

-   `"transient"` doesn't provide any modifications to a resolver behaviour, so the resolver will create a new instance on each request.
-   `"singleton"` forces the resolver to create an instance once and return it in subsequent requests.
-   `"scoped"` forces the resolver to take its instance from a provided [scope](#Scope) or create a new one and save it if there is none. If no scope is passed, it will create a new instance on each request.

## `ResolutionContext`

```ts
type ResolutionContext = {
    scope?: Scope;
    mocks?: MockMap;
};
```

An object that holds information about a [scope](#Scope) and provider [mocks](#MockMap). Passed to the [provider call](#Provider) to resolve scope instances and mock providers.

## `Scope`

```ts
type Scope = Map<Provider<any>, any>;
```

A `Map` of [providers](#Provider) to their instances. Passed to a provider call in a resolution context object to resolve instances of scoped providers within it.

```ts
const scope = createScope();
provider({ scope });
```

### `createScope`

```ts
function createScope(): Scope;
```

Creates a scope instance.

## `MockMap`

```ts
type MockMap = Omit<Map<Provider<any>, Provider<any>>, "set" | "get"> & {
    set<T>(provider: Provider<T>, mock: Provider<T>): MockMap;
    get<T>(provider: Provider<T>): Provider<T> | undefined;
};
```

A `Map` of [providers](#Provider) to providers of the same type. [Lifetime](#Lifetime) is not a part of `Provider` type, so you can use a different one if necessary. Passed to a provider call in a [resolution context](#ResolutionContext) object in order to replace providers with their mocks.

```ts
const otherProvider =
    transitive(() => ...)
const otherProviderMock: typeof otherProvider =
    scoped(() => ...)

const mocks = createMockMap()
mocks.set(otherProvider, otherProviderMock)

provider({ mocks })
```

### `createMockMap`

```ts
function createMockMap(): MockMap;
```

Creates a mock map instance.

## Bulk resolutions

### `resolveList`

```ts
function resolveList<const Providers extends ProviderList>(
    providers: Providers,
    context?: ResolutionContext,
): AwaitAllValuesInCollection<InferProviderCollectionResolutions<Providers>>;
```

-   `providers`: A list of providers.
-   `context`: A resolution context.

Calls every provider in a list with a provided resolution context and returns a list of resolutions. Returns a promise of a list of awaited resolutions if there's at least one promise in the resolutions.

```ts
const resolutions = resolveList([getA, getB, getC], { scope, mocks });
```

### `resolveMap`

```ts
function resolveMap<const Providers extends ProviderRecord>(
    providers: Providers,
    context?: ResolutionContext,
): AwaitAllValuesInCollection<InferProviderCollectionResolutions<Providers>>;
```

-   `providers`: A map of providers.
-   `context`: A resolution context.

Calsl every provider in a map with a provided resolution context and returns a map with identical keys but with resolutions in values instead. Returns a promise of a map of awaited resolutions if there's at least one promise in the resolutions.

```ts
const resolutionMap = resolveMap(
    { a: getA, b: getB, c: getC },
    { scope, mocks },
);
```

# Contribution

This is free and open source project licensed under the [MIT License](LICENSE). You could help its development by contributing via [pull requests](https://github.com/ncor/atomic-di/fork) or [submitting an issue](https://github.com/ncor/atomic-di/issues).
