declare type ConstItem = string | number | boolean | null | undefined | void;
declare type JsonItem = ConstItem | JsonArray | {
    [index: string]: JsonItem;
};
interface JsonArray extends Array<JsonItem> {
}
declare const marker: unique symbol;
declare const optMarker: unique symbol;
interface Mismatch {
    path: string[];
    expected: string;
    actual: string;
}
export interface Errors {
    missing?: string[][];
    extra?: string[][];
    mismatch?: Mismatch[];
}
declare type ItemValidator = (item: JsonItem) => Errors | null;
declare type TemplateItem<T extends JsonItem> = {
    __marker: typeof marker;
    __phantom?: T;
    check: ItemValidator;
};
declare type TemplateItemOrConst<T extends JsonItem> = TemplateItem<T> | (T extends ConstItem ? T : never);
declare type OptionalItem<T extends JsonItem> = TemplateItemOrConst<T> & {
    __optMarker: typeof optMarker;
};
export declare type Template = TemplateItemOrConst<JsonItem>;
export declare type JsonType<Tpl> = Tpl extends TemplateItem<infer Inner> ? Inner : Tpl;
declare type ListInner<T extends TemplateItem<JsonItem>> = T extends TemplateItem<infer Inner> ? Inner : never;
declare type UnionInner<T extends TemplateItemOrConst<JsonItem>> = T extends TemplateItem<infer U> ? U : T;
export declare function validateElement(item: JsonItem, tpl: TemplateItemOrConst<JsonItem>, errors?: Errors | null, key?: string): Errors | null;
export declare const templateItems: {
    Str: TemplateItem<string>;
    Num: TemplateItem<number>;
    True: true;
    False: false;
    Bool: TemplateItem<boolean>;
    Null: null;
    Unknown: TemplateItem<JsonItem>;
    List: <T extends TemplateItem<JsonItem>>(inner: T) => TemplateItem<ListInner<T>[]>;
    Dict: <Inner extends JsonItem>(inner: TemplateItemOrConst<Inner>) => TemplateItem<{
        [index: string]: Inner;
    }>;
    Union: <T_1 extends TemplateItemOrConst<JsonItem>[]>(...inner: T_1) => TemplateItem<UnionInner<T_1[number]>>;
    Rec: <K extends string | number | symbol, T_2 extends { [Key in K]: string | number | boolean | void | TemplateItem<JsonItem> | (TemplateItem<JsonItem> & {
        __optMarker: typeof optMarker;
    }) | (string & {
        __optMarker: typeof optMarker;
    }) | (number & {
        __optMarker: typeof optMarker;
    }) | (false & {
        __optMarker: typeof optMarker;
    }) | (true & {
        __optMarker: typeof optMarker;
    }) | (void & {
        __optMarker: typeof optMarker;
    }) | null | undefined; }>(name: string, tpl: T_2) => TemplateItem<{ [K_2 in { [K_1 in keyof T_2]-?: T_2[K_1] extends OptionalItem<JsonItem> ? K_1 : never; }[keyof T_2]]?: (T_2[K_2] extends OptionalItem<infer I> ? I : never) | undefined; } & { [K_4 in { [K_3 in keyof T_2]-?: T_2[K_3] extends OptionalItem<JsonItem> ? never : K_3; }[keyof T_2]]: T_2[K_4] extends TemplateItem<infer I_1> ? I_1 : T_2[K_4]; }>;
    Partial: <Inner_1 extends {
        [index: string]: JsonItem;
    }>(name: string, tpl: { [K_5 in keyof Inner_1]: TemplateItemOrConst<Inner_1[K_5]>; }) => TemplateItem<Partial<Inner_1>>;
    Optional: <Inner_2 extends JsonItem>(inner: TemplateItemOrConst<Inner_2>) => OptionalItem<Inner_2>;
};
export {};
//# sourceMappingURL=template.d.ts.map