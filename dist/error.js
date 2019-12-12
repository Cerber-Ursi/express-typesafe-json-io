"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// This is mostly a stub, so that we can extend it later.
class JsonTemplateError extends Error {
    // noinspection JSUnusedGlobalSymbols
    constructor(details) {
        super('JSON templating error');
        this.details = details;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.JsonTemplateError = JsonTemplateError;
class CodedError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.CodedError = CodedError;
//# sourceMappingURL=error.js.map