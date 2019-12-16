"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const template_1 = require("./template");
const error_1 = require("./error");
var Kind;
(function (Kind) {
    Kind[Kind["Handler"] = 0] = "Handler";
    Kind[Kind["Middleware"] = 1] = "Middleware";
})(Kind = exports.Kind || (exports.Kind = {}));
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
const generateHandler = (opts, callback) => (req, res, next) => {
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
            // If we're here, either we don't want to validate output value, or it passed the validation
            callback(value, req, res, next);
        })
            .catch((err) => routeError(err, res, next));
    }
};
const wrap = (value, opts, kind) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrapped = value;
    wrapped.input = opts.input;
    wrapped.output = opts.output;
    wrapped.meta = { ...opts.meta, kind: kind };
    return wrapped;
};
exports.typesafe = (opts) => {
    const value = generateHandler(opts, (value, ...[, res]) => res.json(value));
    return wrap(value, opts, Kind.Handler);
};
exports.typesafeTransform = (opts) => {
    const value = generateHandler(opts, (value, ...[req, , next]) => {
        req.body = value;
        next();
    });
    return wrap(value, opts, Kind.Middleware);
};
//# sourceMappingURL=handler.js.map