import { Provider } from "./provider";

type OrAwaited<T> = T | Awaited<T>;
type AwaitedPartial<T> = Partial<Awaited<T>>;
type MaybePromisePartial<T> = AwaitedPartial<T> | Promise<AwaitedPartial<T>>;

type Mock<T> =
    | {
          isPartial: false;
          provider: Provider<OrAwaited<T>>;
      }
    | {
          isPartial: true;
          provider: Provider<MaybePromisePartial<T>>;
      };

type MocksEntries = [Provider<any>, Mock<any>][];

export type Mocks = {
    mock<T>(original: Provider<T>, mock: Provider<OrAwaited<T>>): Mocks;
    mockPartially<T extends object>(
        original: Provider<T>,
        mock: Provider<MaybePromisePartial<T>>,
    ): Mocks;
    get<T>(original: Provider<T>): Mock<T> | undefined;
};

export const createMocks = (entries: MocksEntries = []): Mocks => {
    const set = (key: Provider<any>, value: Mock<any>) =>
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
