import { JsonType, Template, validateElement } from './template';
import { ErrorHandler, RequestHandlerWithTemplates, TypedHandler } from './type-patches';
import { RequestHandler, Response, NextFunction } from 'express';
import { CodedError, JsonTemplateError } from './error';

export interface TypesafeHandlerOptions<InTpl extends Template, OutTpl extends Template> {
    input: InTpl;
    output?: OutTpl;
    handler: TypedHandler<JsonType<InTpl>, JsonType<OutTpl>>;
    onInputError?: ErrorHandler;
    onOutputError?: ErrorHandler;
}

function routeError(err: unknown, res: Response, next: NextFunction): void {
    if (err instanceof CodedError) {
        res.status(err.code);
        res.send(err.message);
    } else {
        next(err);
    }
}

export const typesafe: <InTpl extends Template, OutTpl extends Template>(
    opts: TypesafeHandlerOptions<InTpl, OutTpl>
) => RequestHandlerWithTemplates<InTpl, OutTpl> = (opts) => {
    const value: RequestHandler = (req, res, next) => {
        const errors = validateElement(req.body, opts.input);
        if (errors) {
            const templateError = new JsonTemplateError(errors);
            if (opts.onInputError) {
                try {
                    opts.onInputError(templateError, req, res, next);
                } catch (err) {
                    routeError(err, res, next);
                }
            } else {
                next(templateError);
            }
        } else {
            Promise.resolve(opts.handler(req))
                .then(value => {
                    if (opts.output) {
                        const errors = validateElement(JSON.parse(JSON.stringify(value)), opts.output);
                        if (errors) {
                            const templateError = new JsonTemplateError(errors);
                            if (opts.onOutputError) {
                                try {
                                    opts.onOutputError(templateError, req, res, next);
                                } catch (err) {
                                    routeError(err, res, next);
                                }
                            } else {
                                next(templateError);
                            }
                            return;
                        }
                    }
                    // If we're here, either we don't want to validate output value, or it passed the validation`
                    res.json(value);
                })
                .catch((err) => routeError(err, res, next));
        }
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrapped = value as RequestHandlerWithTemplates<any, any>;
    wrapped.input = opts.input;
    wrapped.output = opts.output || undefined;
    return wrapped;
};
