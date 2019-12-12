import {Errors, JsonTemplateError, JsonType, Template, templateItems, TypedHandler, typesafe} from '..';
import fetch, {Response} from 'node-fetch';
import express = require('express');
import http = require('http');

const PORT = 13000; // configure to fit into your own environment

const {Str, Num, Bool, True, False, Null, List, Dict, Union, Rec, Partial, Optional} = templateItems;

// noinspection JSUnusedLocalSymbols
const errorHandler: express.ErrorRequestHandler = (error, _req, res, _next) => {
    res.status(400);
    res.json(error instanceof JsonTemplateError ? error.details : error);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function execute<Tpl extends Template>(handler: TypedHandler<JsonType<Tpl>>, template: Tpl, value: any): Promise<Response> {
    const app = express();
    app.use(express.json());
    app.post('/', typesafe(handler, template));
    app.use(errorHandler);
    const srv = await new Promise<http.Server>((ok) => {
        const srv = app.listen(PORT, () => ok(srv));
    });
    const res = await fetch(`http://localhost:${PORT}/`, {
        method: 'POST',
        body: JSON.stringify(value),
        headers: {'Content-Type': 'application/json'}
    });
    srv.close();
    return res;
}

const echoHandler: TypedHandler<unknown> = (req, res) => {
    res.send(JSON.stringify(req.body));
    return Promise.resolve();
};

function matchErrors(err1: Errors, err2: Errors): void {
    expect(new Set(err1.missing)).toEqual(new Set(err2.missing));
    expect(new Set(err1.extra)).toEqual(new Set(err2.extra));
    expect(new Set(err1.mismatch)).toEqual(new Set(err2.mismatch));
}

describe('Basic typesafe handler', () => {
    const handler: TypedHandler<{ value: string }> = echoHandler;
    const template = Rec('simple', {value: Str});
    it('should echo the single-field body', async () => {
        const value = {value: 'test'};
        const res = await execute(handler, template, value);
        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual(value);
    });
    it('should error on empty body', async () => {
        const res = await execute(handler, template, {});
        expect(res.status).toBe(400);
        const body = await res.json();
        matchErrors(body, {missing: [['value']]});
    });
});

describe('Typesafe handler', () => {

    describe('with const types', () => {
        const value = {num: 0, str: '1'} as {num: 0; str: '1'};
        const handler: TypedHandler<typeof value> = echoHandler;
        const template = Rec('const types', value);
        it('should echo the valid value', async () => {
            const res = await execute(handler, template, value);
            expect(res.status).toBe(200);
            await expect(res.json()).resolves.toEqual(value);
        });
        it('should error on unmatched consts', async () => {
            const res = await execute(handler, template, {num: 1, str: '2'});
            expect(res.status).toBe(400);
            const body = await res.json();
            matchErrors(body, {
                mismatch: [
                    {expected: '0', actual: '1', path: ['num']},
                    {expected: '"1"', actual: '"2"', path: ['str']}
                ],
            });
        });
    });

    describe('with nullable types', () => {
        const handler: TypedHandler<{ str: string | null; num: number | null }> = echoHandler;
        const template = Rec('nullable', {str: Union(Str, Null), num: Union(Num, null)});
        it('should echo the inhabited value', async () => {
            const value = {num: 1, str: '2'};
            const res = await execute(handler, template, value);
            expect(res.status).toBe(200);
            await expect(res.json()).resolves.toEqual(value);
        });
    });

    describe('with complex type', () => {
        const template = Rec('complex', {
            header: Rec('header', {
                name: Str,
                format: Str,
            }),
            values: List(Union(Num, Rec('item', {value: Num}), Null)),
            flag: Bool,
            additional: Union(
                Rec('nothing', {exists: False}),
                Rec('something', {exists: True, value: Str})
            )
        });
        const handler: TypedHandler<JsonType<typeof template>> = echoHandler;
        const header = {name: 'name', format: 'format'};
        const correctValues: Array<JsonType<typeof template>> = [{
            header: header,
            values: [0, null, {value: 2}],
            flag: true,
            additional: {exists: false},
        }, {
            header: header,
            values: [],
            flag: true,
            additional: {exists: false},
        }, {
            header: header,
            values: [{value: 0}, null, {value: 2}, null, {value: 4}, 5],
            flag: false,
            additional: {exists: true, value: 'additional'}
        }];

        it('should echo correct values', async () => {
            for (const value of correctValues) {
                const res = await execute(handler, template, value);
                expect(res.status).toBe(200);
                await expect(res.json()).resolves.toEqual(value);
            }
        });
        it('should error on missing fields', async () => {
            const res = await execute(handler, template, {
                header: {name: 'string'},
                values: [],
                additional: {exists: false}
            });
            expect(res.status).toEqual(400);
            const errors = await res.json();
            matchErrors(errors, {
                missing: [['header', 'format'], ['flag']]
            });
        });
        it('should error on mismatched fields', async () => {
            const res = await execute(handler, template, {
                header: null,
                values: [0, '1', 2],
                flag: 'true',
                additional: null
            });
            expect(res.status).toEqual(400);
            const errors = await res.json();
            matchErrors(errors, {
                mismatch: [
                    {path: ['header'], expected: 'header', actual: 'null'},
                    {path: ['values', '1'], expected: 'union', actual: 'string'},
                    {path: ['flag'], expected: 'boolean', actual: 'string'},
                    {path: ['additional'], expected: 'union', actual: 'object'}
                ]
            });
        });
    });

    describe('with partial type', () => {
        const template = Partial('pair', {name: Str, value: Str});
        const handler: TypedHandler<JsonType<typeof template>> = echoHandler;
        const correctValues: Array<JsonType<typeof template>> = [{}, {name: 'name'}, {value: 'value'}, {
            name: 'name',
            value: 'value'
        }];
        it('should echo valid partial values', async () => {
            for (const value of correctValues) {
                const res = await execute(handler, template, value);
                expect(res.status).toBe(200);
                await expect(res.json()).resolves.toEqual(value);
            }
        });
        it('should error on type mismatch', async () => {
            const res = await execute(handler, template, {name: 0});
            expect(res.status).toBe(400);
            const body = await res.json();
            matchErrors(body, {
                mismatch: [
                    {path: ['name'], expected: 'string', actual: 'number'}
                ]
            });
        });
        it('should error on nulls in partial type', async () => {
            const res = await execute(handler, template, {name: null});
            expect(res.status).toBe(400);
            const body = await res.json();
            matchErrors(body, {
                mismatch: [
                    {path: ['name'], expected: 'string', actual: 'object'}
                ]
            });
        });
    });

    describe('with optional fields', () => {
        const template = Rec('pair', {name: Str, value: Optional(Str)});
        const handler: TypedHandler<JsonType<typeof template>> = echoHandler;
        const correctValues: Array<JsonType<typeof template>> = [{name: 'name'}, {name: 'name', value: 'value'}];
        it('should echo valid values', async () => {
            for (const value of correctValues) {
                const res = await execute(handler, template, value);
                expect(res.status).toBe(200);
                await expect(res.json()).resolves.toEqual(value);
            }
        });
        it('should error on type mismatch', async () => {
            const res = await execute(handler, template, {name: 'name', value: 0});
            expect(res.status).toBe(400);
            const body = await res.json();
            matchErrors(body, {
                mismatch: [
                    {path: ['value'], expected: 'string', actual: 'number'}
                ]
            });
        });
        it('should error on nulls in partial type', async () => {
            const res = await execute(handler, template, {name: 'name', value: null});
            expect(res.status).toBe(400);
            const body = await res.json();
            matchErrors(body, {
                mismatch: [
                    {path: ['value'], expected: 'string', actual: 'object'}
                ]
            });
        });
    });

    describe('with dictionary type', () => {
        const template = Dict(Str);
        const handler: TypedHandler<JsonType<typeof template>> = echoHandler;
        const correctValues: Array<JsonType<typeof template>> = [{name: 'name'}, {name: 'name', value: 'value'}];
        it('should echo valid values', async () => {
            for (const value of correctValues) {
                const res = await execute(handler, template, value);
                expect(res.status).toBe(200);
                await expect(res.json()).resolves.toEqual(value);
            }
        });
        it('should error on type mismatch', async () => {
            const res = await execute(handler, template, {name: 0, value: null});
            expect(res.status).toBe(400);
            const body = await res.json();
            matchErrors(body, {
                mismatch: [
                    {path: ['name'], expected: 'string', actual: 'number'},
                    {path: ['value'], expected: 'string', actual: 'object'}
                ]
            });
        });
    });

    describe('with custom error handler', () => {
        it('should return customized error', async () => {
            const app = express();
            app.use(express.json());
            app.post('/', typesafe(echoHandler, (err, _req, _res, next) => {
                next(err.details.mismatch && err.details.mismatch[0].path);
            }, Dict(Str)));
            app.use(errorHandler);
            const srv = await new Promise<http.Server>((ok) => {
                const srv = app.listen(PORT, () => ok(srv));
            });
            const res = await fetch(`http://localhost:${PORT}/`, {
                method: 'POST',
                body: JSON.stringify({'value': 0}),
                headers: {'Content-Type': 'application/json'}
            });
            srv.close();
            expect(res.status).toBe(400);
            await expect(res.json()).resolves.toEqual(['value']);
        });
    });
});

describe('Wrapper around typed handler', () => {
    it('should have the immutable template property', () => {
        const template = Dict(Rec('inner', {name: Str, value: Optional(Str)}));
        const wrapper = typesafe(echoHandler, template);
        expect(wrapper.template).toBe(template);
    });
});
