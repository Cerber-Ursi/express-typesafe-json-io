import {JsonType, templateItems, TypedHandler, typesafe} from '..';

const {Str, Num, Bool, True, False, Null, List, Rec, Partial, Optional} = templateItems;

const echoHandler = <T>(): TypedHandler<T, T> => (req): T => req.body;

typesafe({ handler: echoHandler<null>(), input: Str, output: Str});
typesafe({ handler: echoHandler<string>(), input: Null, output: Null});
typesafe({ handler: echoHandler<true>(), input: False, output: False});
typesafe({ handler: echoHandler<true>(), input: Bool, output: Bool});
// this should _not_ generate error!
typesafe({ handler: echoHandler<true>(), input: True, output: True});

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
typesafe({ handler: echoHandler<{}>(), input: Record, output: Rec('empty', {})});

typesafe({ handler: echoHandler<{ string: number }>(), input: Record, output: Record});

typesafe({ handler: echoHandler<{ [index: string]: string }>(), input: Record, output: Record});
typesafe({ handler: echoHandler<{ string: string; number: string }>(), input: Record, output: Record});
typesafe({ handler: echoHandler<Record & { subobj: { string: string; number: number } }>(), input: Record, output: Record});
typesafe({ handler: echoHandler<Record & { opt: string }>(), input: Record, output: Record});

typesafe({ handler: echoHandler<string[]>(), input: List(Num), output: List(Num)});
typesafe({ handler: echoHandler<object[]>(), input: List(Num), output: List(Num)});
