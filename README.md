# atomic-di

This library implements lifetimes, scopes and mocking for pure dependency injection.

# Table of contents

- [Intro](#Intro)
- [Installation](#Installation)
- [Usage](#Usage)
    - [Creating resolvers](#Creating-resolvers)
        - [Transient](#Transient)
        - [Singleton](#Singleton)
        - [Scoped](#Scoped)
    - [Propagating a context](#Propagating-a-context)
    - [Mocking](#Mocking)
        - [Registering mocks](#Registering-mocks)
        - [Resolving with mocks](#Resolving-with-mocks)
    - [Scopes](#Scopes)
        - [Creating a scope](#Scope)
        - [Resolving with a scope](#Resolving-with-a-scope)
    - [Resolving collections](#Resolving-collections)
        - [Resolving a list](#Resolving-a-list)
        - [Resolving a map](#Resolving-a-map)
- [Reference](#Reference)
    - [Functions](#Functions)
        - [`transient`](#transient)
        - [`singleton`](#singleton)
        - [`scoped`](#scoped)
        - [`createMockMap`](#createMockMap)
        - [`createScope`](#createScope)
        - [`resolveList`](#resolveList)
        - [`resolveMap`](#resolveMap)
    - [Types](#Types)
        - [`ResolverFn`](#ResolverFn)
        - [`Resolver`](#Resolver)
        - [`ResolutionContext`](#ResolutionContext)
        - [`MockMap`](#MockMap)
        - [`Scope`](#Scope)

# Intro

Before reading, it's highly recommended that you familiarize yourself with the concepts of inversion of control (IoC) and dependency injection (DI), as well as DI techniques.

If you need a container to build your application, or you are satisfied with pure dependency injection, you should definitely consider other solutions, or not use a framework at all.

This library is an attempt to provide full-featured dependency injection **without containers**.

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
- [Creating resolvers](#Creating-resolvers)
    - [Transient](#Transient)
    - [Singleton](#Singleton)
    - [Scoped](#Scoped)
- [Propagating a context](#Propagating-a-context)
- [Mocking](#Mocking)
    - [Registering mocks](#Registering-mocks)
    - [Resolving with mocks](#Resolving-with-mocks)
- [Scopes](#Scopes)
    - [Creating a scope](#Scope)
    - [Resolving with a scope](#Resolving-with-a-scope)
- [Resolving collections](#Resolving-collections)
    - [Resolving a list](#Resolving-a-list)
    - [Resolving a map](#Resolving-a-map)

## Creating resolvers

The approach to dependency injection in this library is factories. It consists of a factory creating an instance of a certain type by calling other factories that resolve dependencies for it.

To implement lifetimes, scope, and mocking mechanisms, the library provides functions that create factories with functionality specific to a particular lifetime, such factories are called **resolvers**. They all have some functionality in common, but first let's look at the functions that create them.

### Transient

The `transient` function creates a basic resolver that does not contain any logic that controls a lifetime of a resolution. This means that this resolver will call a passed factory and return a new instance each time it is called.
```ts
const getRandom = transient(Math.random)
```
```ts
getRandom() !== getRandom()
```

### Singleton

The `singleton` function creates a resolver that contains a logic specific to singletons. This means that a singleton resolver will only call a passed factory once, and will return a single instance created each time it is called.
```ts
const getRandom = singleton(Math.random)
```
```ts
getRandom() === getRandom()
```

### Scoped

The `scoped` function creates a resolver that contains logic specific to scoped registrations, often supported by IoC containers. These resolvers operate on scope instances that are passed into a resolution context when called. They check whether their instance is in a scope, and depending on this, save a new instance or return an existing one within that scope. If a resolver is not passed a scope when called, it will behave as a singleton, simulating a global scope.
```ts
const getRandom = scoped(Math.random)
```
```ts
getRandom() === getRandom()
```
```ts
getRandom({ scope: myScope }) === getRandom({ scope: myScope })
```
```ts
getRandom() !== getRandom({ scope: myScope })
```

A detailed explanation of the scope mechanism and its use is described in [this](#Scopes) section.

## Propagating a context

Each resolver takes an optional resolution context. This is an object that can contain a scope and a mock map. Based on this context, resolvers determine how to resolve an instance.

In order for a resolution context to correctly influence a current resolution, it **must** be propagated up a resolver call chain so that each resolver is aware of a current context. Therefore, if a factory uses other resolvers, it **must** pass a resolution context it receives into **each** resolver call.

#### Incorrect
```ts
const getDependency = transient(() => createDependency())
const getEntity = transient(() =>
    createEntity(getDependency())
)
```
#### Correct
```ts
const getDependency = transient(() => createDependency())
const getEntity = transient((c) =>
    createEntity(getDependency(c)) // context is propagated
)
```

## Mocking

Mocking is a common mechanism in testing whereby some implementation being used is replaced with a replica to prevent side effects or reduce testing load.

This library implements this mechanism by adding logic to each resolver responsible for replacing **itself** (not a resolution) when its own mock is present in a resolution context. A definition of mocks in a resolution context is done by passing a mock map to this resolution context.

### Registering mocks

A mock map is an immutable object similar to `Map` that implements an interface for registering and receiving mocks of some resolvers. To create one, you must use `createMockMap` function.
```ts
const mocks = createMockMap()
```

To register a mock resolver, use `mock` method, passing an original resolver and its mock. It will create a new mock map with this registration.
```ts
const mocks = createMockMap()
    .mock(getDatabase, getDatabaseMock)
    .mock(getLogger, getLoggerMock)
    // ...
```

If you need to partially replace an implementation, i.e. replace some fields in a resolution, use `mockPartially` method. Both original and mock resolver must return an object or a `Promise` of an object.
```ts
const getDatabaseMock = singleton(() => ({
    execute: (q) => console.log("db: executing", q)
}))
const mocks = createMockMap()
    .mockPartially(getDatabase, getDatabaseMock)
```

### Resolving with mocks

To resolve an instance with mocks, you must pass a previously defined mock map to a resolution context when calling any resolver.
```ts
resolver({ mocks: myMockMap })
```

If resolver's direct or transitive dependencies or the resolver itself have their mock registered in a mock map, they will replace themselves with this mock, depending on a type of a mock. This behavior is clearly demonstrated in examples below.

#### Full mock
```ts
const getDependency = transitive(() => "dependency")
const getEntity = transitive((c) => ({
    dependency: getDependency(c)
}))
```
```ts
const getDependencyMock = transitive(() => "dependencyMock")

const mocks = createMockMap()
    .mock(getDependency, getDependencyMock
```
```ts
getEntity({ mocks }) == {
    dependency: "dependencyMock"
}
```

#### Partial mock
```ts
const getDependency = transitive(() => ({
    value: "dependency",
    origin: "getDependency"
}))
const getEntity = transitive((c) => ({
    dependency: getDependency(c)
}))
```
```ts
const getDependencyMock = transitive(() => ({
    value: "dependencyMock"
}))

const mocks = createMockMap()
    .mockPartially(getDependency, getDependencyMock
```
```ts
getEntity({ mocks }) == {
    dependency: {
        value: "dependencyMock", // replaced
        origin: "getDependency" // original value
    }
}
```

## Scopes

Sometimes you need to create and save resolutions for different areas of your program, such as a request or a thread. Scopes solve this problem.

IoC containers implement this by defining copies of a container in different parts of a program. Within this library, a scope is simply a map of resolvers to their resolutions. This map is used by scoped resolvers described earlier.

### Creating a scope

There are two ways to create a scope:
- By calling `createScope` function.
```ts
const scope = createScope()
```
- By creating a `Map` with the correct type manually.
```ts
const scope = new Map<Resolver<any>, any>()
```

### Resolving with a scope

To get a scoped resolver resolution within a scope, a scoped resolver, or a resolver that has a scoped resolver in its direct or transitive dependencies, must be called with a scope passed to a resolution context.

#### Direct resolution
```ts
const getEntity = scoped(() => createEntity())
```
```ts
const scope = createScope()

const scopeEntity = getEntity({ scope })
```
```ts
scope.get(getEntity) === scopeEntity
```

#### Indirect resolution
```ts
const getDependency = scoped(() => createDependency())
const getEntity = transient((c) => ({
    dependency: getDependency(c)
}))
```
```ts
const scope = createScope()

const entity = getEntity({ scope })
```
```ts
scope.get(getDependency) === entity.dependency
```

## Resolving collections

Often you may need to get resolutions of a large number of resolvers within a single context at once. Doing this manually is inefficient, so the library provides functions specifically for this.

### Resolving a list

If you need to get a list of resolutions of different resolvers, you can use `resolveList` function.
```ts
const getA = scoped(() => createA())
const getB = scoped(() => createB())
const getC = scoped(() => createC())
```
```ts
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

If one of passed resolvers returns a promise, the function will return a `Promise` of a list of awaited resolutions.
```ts
const getA = scoped(() => createA())
const getB = scoped(async () => createB())
const getC = scoped(() => createC())
```
```ts
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

### Resolving a map

If you need to get a map of resolutions of different resolvers, you can use `resolveMap` function.
```ts
const getA = scoped(() => createA())
const getB = scoped(() => createB())
const getC = scoped(() => createC())
```
```ts
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

If one of passed resolvers returns `Promise`, the function will return a `Promise` of a map of awaited resolutions.
```ts
const getA = scoped(() => createA())
const getB = scoped(async () => createB())
const getC = scoped(() => createC())
```
```ts
const scope = createScope()

const resolutions = await resolveList(
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
    - [`transient`](#transient)
    - [`singleton`](#singleton)
    - [`scoped`](#scoped)
    - [`createMockMap`](#createMockMap)
    - [`createScope`](#createScope)
    - [`resolveList`](#resolveList)
    - [`resolveMap`](#resolveMap)
- [Types](#Types)
    - [`ResolverFn`](#ResolverFn)
    - [`Resolver`](#Resolver)
    - [`ResolutionContext`](#ResolutionContext)
    - [`MockMap`](#MockMap)
    - [`Scope`](#Scope)

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
    - `original`: The original resolver.
    - `mock`: The mock resolver.
- `mockPartially`: Registers a partial mock for a resolver, creating a new `MockMap` with this registration. In this case, the mock resolver's resoluton object will be merged with the original resolver's resolution object, overwriting certain fields.
    - `original`: The original resolver.
    - `mock`: The mock resolver.
- `get`: Returns a mock of a resolver or `undefined` if one is not registered.
    - `original`: The original resolver.

Immutable map that registers and provides mocks. Is passed in a resolution context and used by resolvers to replace or partially replace themselves with a mock if one is defined.

### `Scope`
```ts
type Scope = Map<Resolver<any>, any>
```

A `Map` of resolvers to their resolutions. Is passed in a resolution context and used by scoped resolvers to retrieve or save resolution within it.

# Contribution

This is free and open source project licensed under the [MIT License](LICENSE). You could help its development by contributing via [pull requests](https://github.com/ncor/atomic-di/fork) or [submitting an issue](https://github.com/ncor/atomic-di/issues).
