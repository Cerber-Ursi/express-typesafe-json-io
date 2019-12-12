import {JsonType, templateItems, TypedHandler, typesafe} from '..';

const {Str, Num, Bool, True, False, Null, List, Rec, Partial, Optional} = templateItems;

const echoHandler = <T>(): TypedHandler<T> => (req, res): Promise<void> => {
    res.send(JSON.stringify(req.body));
    return Promise.resolve();
};

typesafe(echoHandler<null>(), Str);

typesafe(echoHandler<string>(), Null);

typesafe(echoHandler<true>(), False);
typesafe(echoHandler<true>(), Bool);
// this should _not_ generate error!
typesafe(echoHandler<true>(), True);

const Record = Rec('Record', {
    string: Str,
    number: Num,
    opt: Optional(Str),
    subobj: Partial('Partial', {
        string: Str,
        number: Num,
    })
});
type Record = JsonType<typeof Record>;

// this should _not_ generate error (handler may very well ignore the fields on template!)
typesafe(echoHandler<{}>(), Record);

typesafe(echoHandler<{ string: number }>(), Record);
typesafe(echoHandler<{ [index: string]: string }>(), Record);
typesafe(echoHandler<{ string: string; number: string }>(), Record);
typesafe(echoHandler<Record & { subobj: { string: string; number: number } }>(), Record);
typesafe(echoHandler<Record & { opt: string }>(), Record);

typesafe(echoHandler<string[]>(), List(Num));
typesafe(echoHandler<object[]>(), List(Num));
