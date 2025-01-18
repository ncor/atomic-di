import { Resolver } from "./resolver";

type OrAwaited<T> = T | Awaited<T>;
type AwaitedPartial<T> = Partial<Awaited<T>>;
type MaybePromisePartial<T> = AwaitedPartial<T> | Promise<AwaitedPartial<T>>;

type Mock<T> =
    | {
          isPartial: false;
          provider: Resolver<OrAwaited<T>>;
      }
    | {
          isPartial: true;
          provider: Resolver<MaybePromisePartial<T>>;
      };

type MocksEntries = [Resolver<any>, Mock<any>][];

export type Mocks = {
    mock<T>(original: Resolver<T>, mock: Resolver<OrAwaited<T>>): Mocks;
    mockPartially<T extends object>(
        original: Resolver<T>,
        mock: Resolver<MaybePromisePartial<T>>,
    ): Mocks;
    get<T>(original: Resolver<T>): Mock<T> | undefined;
};

export const createMocks = (entries: MocksEntries = []): Mocks => {
    const set = (key: Resolver<any>, value: Mock<any>) =>
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
