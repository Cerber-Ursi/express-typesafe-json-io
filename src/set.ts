// Copied from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set
// and modified for use in TypeScript module

export function union<T>(setA: Set<T>, setB: Set<T>): Set<T> {
    const _union = new Set(setA);
    for (const elem of setB) {
        _union.add(elem);
    }
    return _union;
}

export function intersection<T>(setA: Set<T>, setB: Set<T>): Set<T> {
    const _intersection = new Set<T>();
    for (const elem of setB) {
        if (setA.has(elem)) {
            _intersection.add(elem);
        }
    }
    return _intersection;
}

export function difference<T>(setA: Set<T>, setB: Set<T>): Set<T> {
    const _difference = new Set(setA);
    for (const elem of setB) {
        _difference.delete(elem);
    }
    return _difference;
}
