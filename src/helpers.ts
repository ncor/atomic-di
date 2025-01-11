/**
 * Creates a function that will invoke the provided function `fn` only once,
 * caching the result for subsequent calls with the same arguments.
 *
 * @returns A new function that returns the cached result after the first call.
 */
export const once = <A extends any[], R>(
    /**
     * The function to invoke once and cache the result.
     */
    fn: (...args: A) => R,
) => {
    let cachedResult: R | undefined;

    return Object.assign(
        (...args: A) => cachedResult ?? (cachedResult = fn(...args)),
        fn,
    );
};
