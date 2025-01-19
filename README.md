# atomic-di

This library implements lifetimes, scopes and mocking for pure dependency injection.

# Table of contents

- [Intro](#Intro)
- [Installation](#Installation)
- [Usage](#Usage)
    - [Providers](#Providers)
        - [Transient](#Transient)
        - [Singleton](#Singleton)
        - [Scoped](#Scoped)
    - [Resolution context](#Resolution-context)
    - [Mocking](#Mocking)
    - [Scoping](#Scoping)
    - [Bulk resolutions](#Bulk-resolutions)
        - [List resolution](#List-resolution)
        - [Map resolution](#Map-resolution)
- [Reference](#Reference)
    - [Functions](#Functions)
        - [transient](#transient)
        - [singleton](#singleton)
        - [scoped](#scoped)
        - [createMockMap](#createMockMap)
        - [createScope](#createScope)
        - [resolveList](#resolveList)
        - [resolveMap](#resolveMap)
    - [Types](#Types)
        - [ResolverFn](#ResolverFn)
        - [Resolver](#Resolver)
        - [ResolutionContext](#ResolutionContext)
        - [MockMap](#MockMap)
        - [Scope](#Scope)

# Intro

## Prerequisites

Before reading, it's highly recommended that you familiarize yourself with the concepts of inversion of control (IoC) and dependency injection (DI), as well as DI techniques.

If you need a container to build your application, or you are satisfied with pure dependency injection, you should definitely consider other solutions, or not use a framework at all.

This library is an attempt to provide full-featured dependency injection **without containers**.

## Problems and solutions

### Lifetimes

We can implement lifetime using static initializations together with factory functions that create instances on demand. However, this can introduce inconsistency into a composition code.

This library solves this problem by allowing to resolve instances once using the same factory technique.

### Scopes

Often in your application you may need to resolve instances separately for different "scopes" of a program, be it a request, a transaction or a worker thread. This behavior can be achieved by correctly distributing transient resolutions, but at scale the complexity of this approach will only increase.

This library solves this problem by introducing into factories (hereinafter referred to as providers) an ability to work with a map of providers to their instances, which serves as a scope.

### Mocking

Testability is an important part of every application. IoC handles this very well, but to perform a unit test we still need to resolve modules. To ensure testing without side effects, developers often use mocking - replacing implementations with others with the same behavior. We can rebuild modules manually for each unit test or group of unit tests, but at scale this approach can introduce a lot of extra manual work without any significant benefit.

This library solves this problem by allowing you to use factories that have been defined for a main application build. It's enough to create a map of mock providers to providers with the same interface, and pass it to a provider call to replace implementations in its dependencies.

# Installation

You can use any package manager.

```bash
npm add atomic-di
```
```bash
npx jsr add @ensi/di
```

# Usage

#### Table of contents
- [Providers](#Providers)
    - [Transient](#Transient)
    - [Singleton](#Singleton)
    - [Scoped](#Scoped)
- [Resolution context](#Resolution-context)
- [Mocking](#Mocking)
- [Scoping](#Scoping)
- [Bulk resolutions](#Bulk-resolutions)
    - [List resolution](#List-resolution)
    - [Map resolution](#Map-resolution)

## Providers

The library provides functions that create providers with behavior typical of singletons, transients, and scopeds.

### Transient

Transient providers are created using `transient` function:
```ts
const getThing = transient(() => createThing())
```

Transient providers are no different from regular factories except for additional logic required for scopes and mocks to work correctly. This logic is also present in other two functions, you can read about it [here](#Resolution-context).

### Singleton

Singleton providers are created using `singleton` function:
```ts
const getA = singleton(() => createA())
const getB = transient((c) => createB(getA(c)))
```

In this case, calling `getA` will always result in a same instance, and a passed factory will only be called once:
```ts
getA() === getA() == getB().A === getB().A
```

You may have noticed that the `getB` provider factory uses a certain `c` argument. This is a context that can optionally be passed when calling a provider, you can read about it [here](#Resolution-context).

### Scoped

Scoped providers are created using `scoped` function:
```ts
const getThing = scoped(() => createThing())
```

When calling this provider without passing a scope to a resolution context, it will create a new unique instance:
```ts
getThing() !== getThing()
```

To get resolutions within a scope, we need to pass it to a provider call in a resolution context object:
```ts
const scope = createScope()

getThing({ scope }) === getThing({ scope })
```

You can read more about scopes [here](#Scoping).

## Resolution context

Each provider can accept a resolution context object. This is an object with optional `scope` and `mocks` fields that defines how an instance will be resolved.

In all provider factories that have dependencies, this context **must** be passed into all calls to other providers to ensure it is propagated up a call chain.

#### Incorrect
```ts
const getA = singleton(() => createA())
const getB = scoped(() => createB(getA()))
const getC = scoped(() => createC(getB()))
```

In this case, a context will not propagate beyond `getC` and other providers will not know about a current scope and mocks, and `getB` will return an instance that is not related to any scopes.

#### Correct
```ts
const getA = singleton(() => createA())
const getB = scoped((c) => createB(getA(c)))
const getC = scoped((c) => createC(getB(c)))
```

In this case, `getC` will propagate a context, and `getB` and `getA` will be aware of a current mocks and scopes, resolving instances correctly.

More details on how provider behaves depending on a passed context can be found in sections about [mocking](#Mocking) and [scoping](#Scoping).

## Mocking

To replace implementations inside factories, we can use a mock map. To create one, we can use `createMockMap` function:
```ts
const mockMap = createMockMap()
```

To register a mock, you need to `set` an entry with an original provider in a key and its mock in a value:
```ts
mockMap.set(getDatabase, getMockDatabase)
```

Once all mocks have been registered, this map can be passed to a provider call. If a provider finds a mock in a resolution context, it checks whether it is among the keys, and in that case returns a mock call instead of itself.

#### Direct replacement
```ts
const getA = transient(() => 1)
const getB = transient((c) => getA(c) + 1)

getB() === 2
```
```ts
const getBee = transient((c) => getA(c) + "bee")
const mocks = createMockMap().set(getB, getBee)

getB({ mocks }) === "1bee"
```

#### Direct/transitive dependency replacement
```ts
const getA = transient(() => 1)
const getB = transient((c) => getA(c) + 1)
const getC = transient((c) => getB(c) + 1)

getC() === 3
```
```ts
const getSea = transient((c) => getB(c) + "sea")
const mocks = createMockMap().set(getC, getSea)

getC({ mocks }) === "2sea"
```

## Scoping

In this library, a scope is a map of providers to their resolutions. To create one, you can use `createScope` function:
```ts
const scope = createScope()
```

It is passed to a scoped provider call or to a call of a provider that has the scoped provider among its transitive dependencies.
- If a scoped provider finds a scope in a resolution context, it first tries to get its own resolution from it. If there is none, it creates a new resolution and places it in the scope below itself.
- If a scope is not passed to a resolution context when calling a scoped provider, the provider will create a new instance, i.e. it will behave as a transient provider.

#### Direct scoped provider call
```ts
const getThing = scoped(() => createThing())
```
```ts
const thing1 = getThing()
const thing2 = getThing()

thing1 !== thing2
```
```ts
const thing1 = getThing({ scope })
const thing2 = getThing({ scope })

thing1 === thing2
```

#### Scoped provider as direct/transitive dependency
```ts
const getScopedDependency = scoped(() => ...)
const getThing = transitive((c) =>
    createThing(getScopedDependency(c))
)
```
```ts
const thing1 = getThing()
const thing2 = getThing()

thing1.scopedDependency !== thing2.scopedDependency
```
```ts
const thing1 = getThing({ scope })
const thing2 = getThing({ scope })

thing1.scopedDependency === thing2.scopedDependency
```

## Bulk resolutions

It often happens that you need to resolve instances of a large number of entities, in our case providers, with a same context. Fortunately, the library provides functions for this.

### List resolution

To resolve instances of a list of providers, you can use `resolveList` function, which takes a list of providers and a common resolution context. If at least one provider in the passed list of providers returns a `Promise`, the function will return a `Promise` of a list of **awaited** resolutions.

#### Only sync providers
```ts
const getA = scoped(() => createA())
const getB = scoped(() => createB())
const getC = scoped(() => createC())

const scope = createScope()
const resolutions = resolveList(
    [getA, getB, getC],
    { scope }
)
```
```ts
resolutions == [
    getA({ scope }),
    getB({ scope }),
    getC({ scope })
]
```

#### Some provider is async
```ts
const getA = scoped(() => createA())
const getB = scoped(async () => await createB())
const getC = scoped(() => createC())

const scope = createScope()
const resolutions = await resolveList(
    [getA, getB, getC],
    { scope }
)
```
```ts
resolutions == [
    getA({ scope }),
    await getB({ scope }),
    getC({ scope })
]
```

### Map resolution

To resolve instances of a provider map, or an object with string keys and providers in a values, you can use `resolveMap` function, which takes a provider map and a common resolution context. If at least one provider in the values of the passed provider map returns a `Promise`, the function will return a `Promise` of a map of **awaited** resolutions.

#### Only sync providers
```ts
const getA = scoped(() => createA())
const getB = scoped(() => createB())
const getC = scoped(() => createC())

const scope = createScope()
const resolutions = resolveMap(
    { a: getA, b: getB, c: getC },
    { scope }
)
```
```ts
resolutions == {
    a: getA({ scope }),
    b: getB({ scope }),
    c: getC({ scope })
}
```

#### Some provider is async
```ts
const getA = scoped(() => createA())
const getB = scoped(async () => await createB())
const getC = scoped(() => createC())

const scope = createScope()
const resolutions = await resolveMap(
    { a: getA, b: getB, c: getC },
    { scope }
)
```
```ts
resolutions == {
    a: getA({ scope }),
    b: await getB({ scope }),
    c: getC({ scope })
}
```

# Reference

#### Table of contents
- [Functions](#Functions)
    - [transient](#transient)
    - [singleton](#singleton)
    - [scoped](#scoped)
    - [createMockMap](#createMockMap)
    - [createScope](#createScope)
    - [resolveList](#resolveList)
    - [resolveMap](#resolveMap)
- [Types](#Types)
    - [ResolverFn](#ResolverFn)
    - [Resolver](#Resolver)
    - [ResolutionContext](#ResolutionContext)
    - [MockMap](#MockMap)
    - [Scope](#Scope)

## Functions

### `transient`
```ts
function transient<T>(fn: ResolverFn<T>): Resolver<T>
```
- `resolver`: A function that takes a resolution context and returns a value of some type.

Creates a resolver that creates a new resolution on each call.

#### Example
```ts
const getEntity = transient(() => createEntity())
getEntity() !== getEntity()
```

### `singleton`
```ts
function singleton<T>(resolver: ResolverFn<T>): Resolver<T>
```
- `resolver`: A function that takes a resolution context and returns a value of some type.

Creates a resolver that creates a resolution once and return it on each call.

#### Example
```ts
const getEntity = singleton(() => createEntity())
getEntity() === getEntity()
```

### `scoped`
```ts
function scoped<T>(resolver: ResolverFn<T>): Resolver<T>
```
- `resolver`: A function that takes a resolution context and returns a value of some type.

Creates a resolver that takes its resolution from a scope or create a new one and save it if there is none. If no scope was passed in a resolution context, it will act as a singleton.

#### Example 1
```ts
const getEntity = scoped(() => createEntity())
getEntity() === getEntity()
```

#### Example 2
```ts
const getEntity = scoped(() => createEntity())
const scope = createScope()
getEntity({ scope }) === getEntity({ scope }) !== getEntity()
```

### `createMockMap`
```ts
function createMockMap(): MockMap
```

Creates a mock map, an immutable map that registers and provides mocks. Is passed in a resolution context and used by resolvers to replace or partially replace themselves with a mock if one is defined.

#### Example
```ts
const mocks = createMockMap()
    .mock(getDependency, getDependencyMock)
    .mockPartially(
        getOtherDependency,
        transient(() => ({ someField: "mock" }))
    )

const entityWithMocks = getEntity({ mocks })
```

### `createScope`
```ts
function createScope(): Scope
```

Creates a `Map` of resolvers to their resolutions. Is passed in a resolution context and used by scoped resolvers to retrieve or save resolution within it.

#### Example
```ts
const requestScope = createScope()

app.use(() => {
    const db = getDb({ scope: requestScope })
})
```

### `resolveList`
```ts
function resolveList<const Resolvers extends ResolverList>(
    resolvers: Resolvers,
    context?: ResolutionContext
): AwaitValuesInCollection<
    InferResolverCollectionResolutions<Resolvers>
>
```
- `resolvers`: A list of resolvers.
- `context?`: A resolution context.

Calls every resolver in a list with a provided resolution context and returns a list of resolutions. Returns a `Promise` of a list of awaited resolutions if there's at least one `Promise` in the resolutions.

#### Example 1
Only sync resolvers:
```ts
const getA = scoped(() => createA())
const getB = scoped(() => createB())
const getC = scoped(() => createC())

const scope = createScope()
const resolutions = resolveList(
    [getA, getB, getC],
    { scope }
)
```
```ts
resolutions == [
    getA({ scope }),
    getB({ scope }),
    getC({ scope })
]
```

#### Example 2
Some resolver is async:
```ts
const getA = scoped(() => createA())
const getB = scoped(async () => await createB())
const getC = scoped(() => createC())

const scope = createScope()
const resolutions = await resolveList(
    [getA, getB, getC],
    { scope }
)
```
```ts
resolutions == [
    getA({ scope }),
    await getB({ scope }),
    getC({ scope })
]
```

### `resolveMap`
```ts
function resolveMap<const Resolvers extends ResolverRecord>(
    resolvers: Resolvers,
    context?: ResolutionContext
): AwaitValuesInCollection<
    InferResolverCollectionResolutions<Resolvers>
>
```
- `resolvers`: A map of resolvers.
- `context?`: A resolution context.

Calls every resolver in a map with a provided resolution context and returns a map with identical keys but with resolutions in values instead. Returns a `Promise` of a map awaited resolutions if there's at least one `Promise` in the resolutions.

#### Example 1
Only sync resolvers:
```ts
const getA = scoped(() => createA())
const getB = scoped(() => createB())
const getC = scoped(() => createC())

const scope = createScope()
const resolutions = resolveMap(
    { a: getA, b: getB, c: getC },
    { scope }
)
```
```ts
resolutions == {
    a: getA({ scope }),
    b: getB({ scope }),
    c: getC({ scope })
}
```

#### Example 2
Some resolver is async:
```ts
const getA = scoped(() => createA())
const getB = scoped(async () => await createB())
const getC = scoped(() => createC())

const scope = createScope()
const resolutions = await resolveMap(
    { a: getA, b: getB, c: getC },
    { scope }
)
```
```ts
resolutions == {
    a: getA({ scope }),
    b: await getB({ scope }),
    c: getC({ scope })
}
```

## Types

### `ResolverFn`
```ts
type ResolverFn<T> = (context?: ResolutionContext) => T
```

A function that takes a resolution context and returns a value of some type.

### `Resolver`
```ts
type Resolver<T> = (context?: ResolutionContext) => T
```

A function that returns a value of some type based on a resolution context.

### `ResolutionContext`
```ts
type ResolutionContext = {
    scope?: Scope;
    mocks?: MockMap;
}
```

A context used by resolvers that defines the behaviour of the resolver with the passed mocks and scope.

### `MockMap`
```ts
type MockMap = {
    mock<T>(original: Resolver<T>, mock: Resolver<T>): MockMap;
    mockPartially<T extends object>(
        original: Resolver<T>,
        mock: Resolver<PromiseAwarePartial<T>>,
    ): MockMap;
    get<T>(original: Resolver<T>): Mock<T> | undefined;
};
```
- `mock`: Registers a mock for a resolver, creating a new `MockMap` with this registration.
    - `original`: The original provider.
    - `mock`: The mock resolver.
- `mockPartially`: Registers a partial mock for a resolver, creating a new `MockMap` with this registration. In this case, the mock resolver's resoluton object will be merged with the original resolver's resolution object, overwriting certain fields.
    - `original`: The original resolver.
    - `mock`: The mock resolver.
- `get`: Returns a mock of a resolver or `undefined` if one is not registered.
    - `original`: The original provider.

Immutable map that registers and provides mocks. Is passed in a resolution context and used by resolvers to replace or partially replace themselves with a mock if one is defined.

### `Scope`
```ts
type Scope = Map<Resolver<any>, any>
```

A `Map` of resolvers to their resolutions. Is passed in a resolution context and used by scoped resolvers to retrieve or save resolution within it.

# Contribution

This is free and open source project licensed under the [MIT License](LICENSE). You could help its development by contributing via [pull requests](https://github.com/ncor/atomic-di/fork) or [submitting an issue](https://github.com/ncor/atomic-di/issues).
