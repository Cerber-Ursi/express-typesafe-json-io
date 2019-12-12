import tsd from 'tsd';

// hell, I'm lazy, I don't want to look for how this type can be imported, I just calculate it!
type Diagnostic = ReturnType<typeof tsd> extends Promise<infer I> ? I extends object[] ? I[number] : never : never;

describe('Incorrectly used typesafe wrapper', () => {
    it('should raise appropriate type errors', async () => {
        const diags = (await tsd()).map(diag => {
            const match = /\/test-d\/(.*)$/.exec(diag.fileName);
            return match && {...diag, fileName: '$ROOT/test-d/' + match[1]} as Diagnostic;
        }).filter(Boolean);
        expect(new Set(diags)).toMatchSnapshot();
    });
});
