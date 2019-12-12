import { Errors } from '.';
export declare class JsonTemplateError extends Error {
    details: Errors;
    constructor(details: Errors);
}
export declare class CodedError extends Error {
    code: number;
    constructor(code: number, message: string);
}
//# sourceMappingURL=error.d.ts.map