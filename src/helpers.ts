/**
 * Creates a function that will invoke the provided function `fn` only once,
 * caching the result for subsequent calls with the same arguments.
 *
 * @param fn - The function to invoke once and cache the result.
 *
 * @returns A new function that returns the cached result after the first call.
 */
export const once = <A extends any[], R>(fn: (...args: A) => R) => {
    let returned = false;
    let result: R | undefined;

    return Object.assign((...args: A): R => {
        if (returned) return result!;

        result = fn(...args);
        returned = true;

        return result;
    }, fn);
};
