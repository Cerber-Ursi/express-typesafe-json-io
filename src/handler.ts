import { Errors, JsonType, Template, validateElement } from './template';
import { ErrorHandler, RequestHandlerWithTemplates, TypedHandler } from './type-patches';
import { RequestHandler, Response, NextFunction, Request } from 'express';
import { CodedError, JsonTemplateError } from './error';

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

function routeError(err: unknown, res: Response, next: NextFunction): void {
    if (err instanceof CodedError) {
        res.status(err.code);
        res.send(err.message);
    } else {
        next(err);
    }
}

function handleValidationError(errors: Errors, cb: ErrorHandler | undefined, req: Request, res: Response, next: NextFunction): void {
    const templateError = new JsonTemplateError(errors);
    if (cb) {
        try {
            cb(templateError, req, res, next);
        } catch (err) {
            routeError(err, res, next);
        }
    } else {
        next(templateError);
    }
}

export const typesafe: <InTpl extends Template, OutTpl extends Template>(
    opts: TypesafeHandlerOptions<InTpl, OutTpl>
) => RequestHandlerWithTemplates<InTpl, OutTpl> = (opts) => {
    const value: RequestHandler = (req, res, next) => {
        const errors = validateElement(req.body, opts.input);
        if (errors) {
            handleValidationError(errors, opts.onInputError, req, res, next);
        } else {
            Promise.resolve(opts.handler(req))
                .then(value => {
                    if (opts.output) {
                        const errors = validateElement(JSON.parse(JSON.stringify(value)), opts.output);
                        if (errors) {
                            handleValidationError(errors, opts.onOutputError, req, res, next);
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
