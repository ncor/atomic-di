import { Provider, ResolutionContext } from "./provider";

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
    resolve<T>(original: Provider<T>, context?: ResolutionContext): T;
};

export const createMocks = (entries: MocksEntries = []): Mocks => {
    const get = (key: Provider<any>) =>
        entries.find((entry) => entry[0] === key)?.[1];
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
        resolve<T>(original: Provider<T>, context?: ResolutionContext) {
            const mock = get(original);
            if (!mock) return original(context);

            if (!mock.isPartial) return mock.provider(context) as T;

            const originalResolution = original(context);
            const mockResolution = mock.provider(context);

            if (
                originalResolution instanceof Promise ||
                mockResolution instanceof Promise
            )
                return Promise.all([originalResolution, mockResolution]).then(
                    ([a, b]) => Object.assign(a as object, b),
                ) as T;

            return Object.assign(
                originalResolution as object,
                mockResolution,
            ) as T;
        },
    };
};
