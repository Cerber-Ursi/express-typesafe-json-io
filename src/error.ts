import { Errors } from '.';

// This is mostly a stub, so that we can extend it later.
export class JsonTemplateError extends Error {
    // noinspection JSUnusedGlobalSymbols
    constructor(public details: Errors) {
        super('JSON templating error');
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class CodedError extends Error {
    constructor(public code: number, message: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
