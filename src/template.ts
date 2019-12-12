import * as setOps from './set';

type ConstItem = string | number | boolean | null | undefined | void;
// it is written this way (not through JsonItem[]) for compatibility with TS < 3.7
type JsonItem = ConstItem | JsonArray | { [index: string]: JsonItem };

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface JsonArray extends Array<JsonItem> {
}

const marker = Symbol('JSON template value');
const optMarker = Symbol('JSON optional template value');

interface Mismatch {
    path: string[];
    expected: string;
    actual: string;
}

export interface Errors {
    missing?: string[][];
    extra?: string[][];
    mismatch?: Mismatch[];
}

type ItemValidator = (item: JsonItem) => Errors | null;
type TemplateItem<T extends JsonItem> = {
    __marker: typeof marker;
    __phantom?: T;
    check: ItemValidator;
}
type TemplateItemOrConst<T extends JsonItem> = TemplateItem<T> | (T extends ConstItem ? T : never);
type OptionalItem<T extends JsonItem> = TemplateItemOrConst<T> & {
    __optMarker: typeof optMarker;
}

function isTemplateItem<T extends JsonItem>(item: TemplateItemOrConst<T>): item is TemplateItem<T> {
    return typeof item === 'object' && item && '__marker' in item && item.__marker === marker;
}

function isOptionalItem<T extends JsonItem>(item: TemplateItemOrConst<T> | OptionalItem<T>): item is OptionalItem<T> {
    return typeof item === 'object' && item && '__optMarker' in item && item.__optMarker === optMarker;
}

function isConstItem(item: JsonItem): item is ConstItem {
    return typeof item !== 'object' || item === null;
}

function checkConst(expected: ConstItem, actual: JsonItem): Errors | null {
    return isConstItem(actual) && expected === actual ? null : {
        mismatch: [{
            expected: JSON.stringify(expected),
            actual: JSON.stringify(actual),
            path: []
        }]
    };
}

function templateItem<T extends JsonItem>(check: ItemValidator): TemplateItem<T> {
    return {__marker: marker, check};
}

function simpleItem(expected: string, check: (item: JsonItem) => boolean): ItemValidator {
    return (item): Errors | null => check(item) ? null : {mismatch: [{expected, actual: typeof item, path: []}]};
}

export type Template = TemplateItemOrConst<JsonItem>;
export type JsonType<Tpl> = Tpl extends TemplateItem<infer Inner> ? Inner : Tpl;

const Str: TemplateItem<string> = templateItem(simpleItem('string', (item) => typeof item === 'string'));
const Num: TemplateItem<number> = templateItem(simpleItem('number', (item) => typeof item === 'number'));

// These fields are defined as constants, since we don't need to check the type (the value is enough).
const True = true as const;
const False = false as const;
const Null = null;

// It can be emulated using Union(true, false), but we'll provide the explicit validator for convenience
const Bool: TemplateItem<boolean> = templateItem(simpleItem('boolean', (item) => typeof item === 'boolean'));

type ListInner<T extends TemplateItem<JsonItem>> = T extends TemplateItem<infer Inner> ? Inner : never;
const List = <T extends TemplateItem<JsonItem>>(
    inner: T
): TemplateItem<Array<ListInner<T>>> => {
    return templateItem((items) => {
        if (!Array.isArray(items)) {
            return {mismatch: [{expected: 'array', actual: typeof items, path: []}]};
        }
        const errors = items.map(inner.check);
        if (errors.every((err) => err === null)) {
            return null;
        }
        return errors
            .map((err, id) => ({err, id: id.toString()}))
            .filter(({err}) => err !== null)
            // TODO tell TypeScript that err is guaranteed not to be null
            .reduce<Required<Errors>>(({extra, missing, mismatch}, {err, id}) => ({
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                extra: extra.concat((err!.extra || []).map(path => [id].concat(path))),
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                missing: missing.concat((err!.missing || []).map(path => [id].concat(path))),
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                mismatch: mismatch.concat((err!.mismatch || []).map(({expected, actual, path}) => ({
                    expected, actual, path: [id].concat(path)
                })))
            }), {extra: [], missing: [], mismatch: []});
    });
};

type UnionInner<T extends Array<TemplateItemOrConst<JsonItem>>> = T extends Array<TemplateItemOrConst<infer U>> ? U : never;
const Union = <T extends Array<TemplateItemOrConst<JsonItem>>>(
    ...inner: T
): TemplateItem<UnionInner<T>> => {
    if (inner.length === 0) {
        throw new Error('Empty union is equal to never type');
    }
    return templateItem((item) => {
        const errors = inner.map(tpl => isTemplateItem(tpl) ? tpl.check(item) : checkConst(tpl, item));
        if (errors.some(err => err === null)) {
            return null;
        }
        // TODO return something helpful
        return {mismatch: [{expected: 'union', actual: typeof item, path: []}]};
    });
};

export function validateElement(item: JsonItem, tpl: TemplateItemOrConst<JsonItem>, errors: Errors | null = null, key?: string): Errors | null {
    errors = errors || {};
    const local = typeof key === 'string' ? [key] : [];
    if (item === undefined) {
        if (!isOptionalItem(tpl)) {
            errors.missing = (errors.missing || []).concat([local]);
        }
        // ...and if it's optional, well, do nothing.
    } else {
        const keyError = isTemplateItem(tpl) ? tpl.check(item) : checkConst(tpl, item);
        if (keyError !== null) {
            if (keyError.missing) {
                errors.missing = (errors.missing || []).concat(keyError.missing.map((path) => local.concat(path)));
            }
            if (keyError.extra) {
                errors.extra = (errors.extra || []).concat(keyError.extra.map((path) => local.concat(path)));
            }
            if (keyError.mismatch) {
                errors.mismatch = (errors.mismatch || []).concat(keyError.mismatch.map(({expected, actual, path}) => ({
                    expected, actual, path: local.concat(path)
                })));
            }
        }
    }
    if ([...(errors.missing || []), ...(errors.extra || []), ...(errors.mismatch || [])].length > 0) {
        return errors;
    } else {
        return null;
    }
}

type OptionalPropertyNames<T> = {
    [K in keyof T]-?: T[K] extends OptionalItem<JsonItem> ? K : never
}[keyof T];
type RequiredPropertyNames<T> = {
    [K in keyof T]-?: T[K] extends OptionalItem<JsonItem> ? never : K
}[keyof T];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Rec = <K extends keyof any, T extends { [Key in K]: OptionalItem<JsonItem> | TemplateItem<JsonItem> | ConstItem }>(
    name: string,
    tpl: T
): TemplateItem<{
    [K in OptionalPropertyNames<T>]?: T[K] extends OptionalItem<infer I> ? I : never
} & {
    [K in RequiredPropertyNames<T>]: T[K] extends TemplateItem<infer I> ? I : T[K];
}> => {
    return templateItem((item) => {
        if (typeof item !== 'object') {
            return {mismatch: [{expected: name, actual: typeof item, path: []}]};
        }
        if (Array.isArray(item)) {
            return {mismatch: [{expected: name, actual: 'array', path: []}]};
        }
        if (item === null) {
            return {mismatch: [{expected: name, actual: 'null', path: []}]};
        }

        const tplKeys = new Set(Object.keys(tpl));
        const objKeys = new Set(Object.keys(item));
        const keys = Array.from(tplKeys).sort();

        const extra = Array.from(setOps.difference(objKeys, tplKeys)).map(item => [item]);
        let errors: Errors | null = extra.length > 0 ? {extra} : null;

        for (const key of keys) {
            const tplElement = tpl[key as keyof T];
            const itemElement = item[key];
            const newErrors = validateElement(itemElement, tplElement, errors, key);
            errors = errors || newErrors ? {...(errors || {}), ...(newErrors || {})} : null;
        }

        return errors;
    });
};

// Well, we could do this as Union(inner, undefined)...
// But this would likely leave as with much less information in the error.
const Optional = <Inner extends JsonItem>(inner: TemplateItemOrConst<Inner>): OptionalItem<Inner> => {
    let out: OptionalItem<Inner>;
    if (isTemplateItem(inner)) {
        out = {...inner, __optMarker: optMarker};
    } else {
        // assume this is the simple type, i.e. it can be cloned this way
        out = JSON.parse(JSON.stringify(inner));
        out.__optMarker = optMarker;
    }
    return out;
};

const Partial = <Inner extends { [index: string]: JsonItem }>(
    name: string,
    tpl: { [K in keyof Inner]: TemplateItemOrConst<Inner[K]> }
): TemplateItem<Partial<Inner>> => {
    const partial = {} as { [K in keyof Inner]: OptionalItem<Inner[K]> };
    for (const key of Object.keys(tpl)) {
        partial[key as keyof Inner] = Optional(tpl[key]);
    }
    // this type assertion is safe, since these two types are essentially equivalent,
    // the Partial<Inner> case is simply more ergonomic
    return Rec(name, partial) as TemplateItem<Partial<Inner>>;
};

const Dict = <Inner extends JsonItem>(inner: TemplateItemOrConst<Inner>): TemplateItem<{ [index: string]: Inner }> => {
    return templateItem((item) => {
        if (typeof item !== 'object') {
            return {mismatch: [{expected: 'dict', actual: typeof item, path: []}]};
        }
        if (Array.isArray(item)) {
            return {mismatch: [{expected: 'dict', actual: 'array', path: []}]};
        }
        if (item === null) {
            return {mismatch: [{expected: 'dict', actual: 'null', path: []}]};
        }

        let errors = null;
        for (const key of Object.keys(item)) {
            const newErrors = validateElement(item[key], inner, errors, key);
            errors = errors || newErrors ? {...(errors || {}), ...(newErrors || {})} : null;
        }
        return errors;
    });
};

export const templateItems = {
    Str,
    Num,
    True,
    False,
    Bool,
    Null,
    List,
    Dict,
    Union,
    Rec,
    Partial,
    Optional,
};
