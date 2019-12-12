import * as ts from 'ts30';

const message = (msg: string | ts.DiagnosticMessageChain): string => {
    if (typeof msg === 'string') {
        return msg;
    } else {
        let text = msg.messageText;
        while (msg.next) {
            text += '\n\tCaused by:\n\t\t' + msg.next.messageText;
            msg = msg.next;
        }
        return text;
    }
};

describe('Typesafe template', () => {
    it('should be handled correctly by TS 3.0', () => {
        const prog = ts.createProgram(['test/usage.test.ts', 'node_modules/@types/jest/index.d.ts'], {lib: ['lib.es6.d.ts']});
        const diags = ts.getPreEmitDiagnostics(prog);
        try {
            expect(diags.length).toBe(0);
        } catch (e) {
            console.log('Diags messages:\n' + diags.map(diag => message(diag.messageText)).join('\n'));
            throw e;
        }
    });
});
