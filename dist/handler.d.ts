import { JsonType, Template } from './template';
import { ErrorHandler, RequestHandlerWithTemplates, TypedHandler } from './type-patches';
export interface TypesafeHandlerOptions<InTpl extends Template, OutTpl extends Template> {
    input: InTpl;
    output?: OutTpl;
    handler: TypedHandler<JsonType<InTpl>, JsonType<OutTpl>>;
    onInputError?: ErrorHandler;
    onOutputError?: ErrorHandler;
}
export declare const typesafe: <InTpl extends Template, OutTpl extends Template>(opts: TypesafeHandlerOptions<InTpl, OutTpl>) => RequestHandlerWithTemplates<InTpl, OutTpl>;
//# sourceMappingURL=handler.d.ts.map