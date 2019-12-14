import { JsonType, Template } from './template';
import { ErrorHandler, RequestHandlerWithTemplates, TypedHandler } from './type-patches';
/**
 * Input for `typesafe` function.
 *
 * @prop {Template} input - Template for validating incoming JSON data.
 * @prop {Template} [output] - Template for validating handler result. If it isn't provided, result won't be checked.
 * @prop {TypedHandler} handler - Function receiving `Request` object with `body` property typed according to `input`
 * and returning some object typed according to `output`, if it exists.
 * @prop {ErrorHandler} [onInputError] - Function called on input validation error. If it isn't provided, `typesafe` will
 * pass the error into the `NextFunction`.
 * @prop {ErrorHandler} [onOutputError] - Function called on result validation error. If it isn't provided, `typesafe` will
 * pass the error into the `NextFunction`.
 *
 */
export interface TypesafeHandlerOptions<InTpl extends Template, OutTpl extends Template> {
    input: InTpl;
    output?: OutTpl;
    handler: TypedHandler<JsonType<InTpl>, JsonType<OutTpl>>;
    onInputError?: ErrorHandler;
    onOutputError?: ErrorHandler;
}
export declare const typesafe: <InTpl extends Template, OutTpl extends Template>(opts: TypesafeHandlerOptions<InTpl, OutTpl>) => RequestHandlerWithTemplates<InTpl, OutTpl>;
//# sourceMappingURL=handler.d.ts.map