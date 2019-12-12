import { NextFunction, Request, RequestHandler, Response } from 'express';
import { JsonTemplateError } from './error';
import { Template } from './template';
declare type Patched<Base, Patch> = Pick<Base, Exclude<keyof Base, keyof Patch>> & Patch;
export declare type TypedRequest<B = never> = Patched<Request, {
    body: B;
}>;
export declare type TypedHandler<In, Out> = (req: TypedRequest<In>) => Out;
export declare type ErrorHandler<RetEr = void> = (err: JsonTemplateError, req: TypedRequest<unknown>, res: Response, next: NextFunction) => void | RetEr;
export interface RequestHandlerWithTemplates<InTpl extends Template, OutTpl extends Template> extends RequestHandler {
    input: InTpl;
    output: OutTpl;
}
export {};
//# sourceMappingURL=type-patches.d.ts.map