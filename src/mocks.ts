import { ResolverFn } from "./resolver";

type OrAwaited<T> = T | Awaited<T>;
type AwaitedPartial<T> = Partial<Awaited<T>>;
type MaybePromisePartial<T> = AwaitedPartial<T> | Promise<AwaitedPartial<T>>;

type Mock<T> =
    | {
          isPartial: false;
          provider: ResolverFn<OrAwaited<T>>;
      }
    | {
          isPartial: true;
          provider: ResolverFn<MaybePromisePartial<T>>;
      };

type MocksEntries = [ResolverFn<any>, Mock<any>][];

export type Mocks = {
    mock<T>(original: ResolverFn<T>, mock: ResolverFn<OrAwaited<T>>): Mocks;
    mockPartially<T extends object>(
        original: ResolverFn<T>,
        mock: ResolverFn<MaybePromisePartial<T>>,
    ): Mocks;
    get<T>(original: ResolverFn<T>): Mock<T> | undefined;
};

export const createMocks = (entries: MocksEntries = []): Mocks => {
    const set = (key: ResolverFn<any>, value: Mock<any>) =>
        createMocks([
            ...entries.filter((entry) => entry[0] !== key),
            [key, value],
        ]);

    return {
        mock(original, mock) {
            return set(original, {
                isPartial: false,
                provider: mock,
            });
        },
        mockPartially(original, mock) {
            return set(original, {
                isPartial: true,
                provider: mock,
            });
        },
        get(original) {
            return entries.find((entry) => entry[0] === original)?.[1];
        },
    };
};
