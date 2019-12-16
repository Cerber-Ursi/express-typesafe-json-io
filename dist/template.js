"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const setOps = __importStar(require("./set"));
const marker = Symbol('JSON template value');
const optMarker = Symbol('JSON optional template value');
function isTemplateItem(item) {
    return typeof item === 'object' && item && '__marker' in item && item.__marker === marker;
}
function isOptionalItem(item) {
    return typeof item === 'object' && item && '__optMarker' in item && item.__optMarker === optMarker;
}
function isConstItem(item) {
    return typeof item !== 'object' || item === null;
}
function checkConst(expected, actual) {
    return isConstItem(actual) && expected === actual ? null : {
        mismatch: [{
                expected: JSON.stringify(expected),
                actual: JSON.stringify(actual),
                path: []
            }]
    };
}
function templateItem(check) {
    return { __marker: marker, check };
}
function simpleItem(expected, check) {
    return (item) => check(item) ? null : { mismatch: [{ expected, actual: typeof item, path: [] }] };
}
const Str = templateItem(simpleItem('string', (item) => typeof item === 'string'));
const Num = templateItem(simpleItem('number', (item) => typeof item === 'number'));
// These fields are defined as constants, since we don't need to check the type (the value is enough).
const True = true;
const False = false;
const Null = null;
// It can be emulated using Union(true, false), but we'll provide the explicit validator for convenience
const Bool = templateItem(simpleItem('boolean', (item) => typeof item === 'boolean'));
// `Unknown` types always validates, but must be checked afterwards, since it can be any JSON at all
// (it's not the TypeScript's `unknown`, however, since JSON itself is limited)
const Unknown = templateItem(() => null);
const List = (inner) => {
    return templateItem((items) => {
        if (!Array.isArray(items)) {
            return { mismatch: [{ expected: 'array', actual: typeof items, path: [] }] };
        }
        const errors = items.map(inner.check);
        if (errors.every((err) => err === null)) {
            return null;
        }
        return errors
            .map((err, id) => ({ err, id: id.toString() }))
            .filter(({ err }) => err !== null)
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            .map(({ err, id }) => ({ err: err, id }))
            // TODO tell TypeScript that err is guaranteed not to be null
            .reduce(({ extra, missing, mismatch }, { err, id }) => ({
            extra: extra.concat((err.extra || []).map(path => [id].concat(path))),
            missing: missing.concat((err.missing || []).map(path => [id].concat(path))),
            mismatch: mismatch.concat((err.mismatch || []).map(({ expected, actual, path }) => ({
                expected, actual, path: [id].concat(path)
            })))
        }), { extra: [], missing: [], mismatch: [] });
    });
};
const Union = (...inner) => {
    if (inner.length === 0) {
        throw new Error('Empty union is equal to never type');
    }
    return templateItem((item) => {
        const errors = inner.map(tpl => isTemplateItem(tpl) ? tpl.check(item) : checkConst(tpl, item));
        if (errors.some(err => err === null)) {
            return null;
        }
        // TODO return something helpful
        return { mismatch: [{ expected: 'union', actual: typeof item, path: [] }] };
    });
};
function validateElement(item, tpl, errors = null, key) {
    errors = errors || {};
    const local = typeof key === 'string' ? [key] : [];
    if (item === undefined) {
        if (!isOptionalItem(tpl)) {
            errors.missing = (errors.missing || []).concat([local]);
        }
        // ...and if it's optional, well, do nothing.
    }
    else {
        const keyError = isTemplateItem(tpl) ? tpl.check(item) : checkConst(tpl, item);
        if (keyError !== null) {
            if (keyError.missing) {
                errors.missing = (errors.missing || []).concat(keyError.missing.map((path) => local.concat(path)));
            }
            if (keyError.extra) {
                errors.extra = (errors.extra || []).concat(keyError.extra.map((path) => local.concat(path)));
            }
            if (keyError.mismatch) {
                errors.mismatch = (errors.mismatch || []).concat(keyError.mismatch.map(({ expected, actual, path }) => ({
                    expected, actual, path: local.concat(path)
                })));
            }
        }
    }
    if ([...(errors.missing || []), ...(errors.extra || []), ...(errors.mismatch || [])].length > 0) {
        return errors;
    }
    else {
        return null;
    }
}
exports.validateElement = validateElement;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Rec = (name, tpl) => {
    return templateItem((item) => {
        if (typeof item !== 'object') {
            return { mismatch: [{ expected: name, actual: typeof item, path: [] }] };
        }
        if (Array.isArray(item)) {
            return { mismatch: [{ expected: name, actual: 'array', path: [] }] };
        }
        if (item === null) {
            return { mismatch: [{ expected: name, actual: 'null', path: [] }] };
        }
        const tplKeys = new Set(Object.keys(tpl));
        const objKeys = new Set(Object.keys(item));
        const keys = Array.from(tplKeys).sort();
        const extra = Array.from(setOps.difference(objKeys, tplKeys)).map(item => [item]);
        let errors = extra.length > 0 ? { extra } : null;
        for (const key of keys) {
            const tplElement = tpl[key];
            const itemElement = item[key];
            const newErrors = validateElement(itemElement, tplElement, errors, key);
            errors = errors || newErrors ? { ...(errors || {}), ...(newErrors || {}) } : null;
        }
        return errors;
    });
};
// Well, we could do this as Union(inner, undefined)...
// But this would likely leave as with much less information in the error.
const Optional = (inner) => {
    let out;
    if (isTemplateItem(inner)) {
        out = { ...inner, __optMarker: optMarker };
    }
    else {
        // assume this is the simple type, i.e. it can be cloned this way
        out = JSON.parse(JSON.stringify(inner));
        out.__optMarker = optMarker;
    }
    return out;
};
const Partial = (name, tpl) => {
    const partial = {};
    for (const key of Object.keys(tpl)) {
        partial[key] = Optional(tpl[key]);
    }
    // this type assertion is safe, since these two types are essentially equivalent,
    // the Partial<Inner> case is simply more ergonomic
    return Rec(name, partial);
};
const Dict = (inner) => {
    return templateItem((item) => {
        if (typeof item !== 'object') {
            return { mismatch: [{ expected: 'dict', actual: typeof item, path: [] }] };
        }
        if (Array.isArray(item)) {
            return { mismatch: [{ expected: 'dict', actual: 'array', path: [] }] };
        }
        if (item === null) {
            return { mismatch: [{ expected: 'dict', actual: 'null', path: [] }] };
        }
        let errors = null;
        for (const key of Object.keys(item)) {
            const newErrors = validateElement(item[key], inner, errors, key);
            errors = errors || newErrors ? { ...(errors || {}), ...(newErrors || {}) } : null;
        }
        return errors;
    });
};
exports.templateItems = {
    Str,
    Num,
    True,
    False,
    Bool,
    Null,
    Unknown,
    List,
    Dict,
    Union,
    Rec,
    Partial,
    Optional,
};
//# sourceMappingURL=template.js.map