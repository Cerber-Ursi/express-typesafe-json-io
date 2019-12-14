"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const template_1 = require("./template");
const error_1 = require("./error");
function routeError(err, res, next) {
    if (err instanceof error_1.CodedError) {
        res.status(err.code);
        res.send(err.message);
    }
    else {
        next(err);
    }
}
function handleValidationError(errors, cb, req, res, next) {
    const templateError = new error_1.JsonTemplateError(errors);
    if (cb) {
        try {
            cb(templateError, req, res, next);
        }
        catch (err) {
            routeError(err, res, next);
        }
    }
    else {
        next(templateError);
    }
}
exports.typesafe = (opts) => {
    const value = (req, res, next) => {
        const errors = template_1.validateElement(req.body, opts.input);
        if (errors) {
            handleValidationError(errors, opts.onInputError, req, res, next);
        }
        else {
            Promise.resolve(opts.handler(req))
                .then(value => {
                if (opts.output) {
                    const errors = template_1.validateElement(JSON.parse(JSON.stringify(value)), opts.output);
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
    const wrapped = value;
    wrapped.input = opts.input;
    wrapped.output = opts.output || undefined;
    return wrapped;
};
//# sourceMappingURL=handler.js.map