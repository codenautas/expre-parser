"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discrepances = require("discrepances");
// import * as fs from 'fs-extra';
require("mocha");
const ExpreParser = require("../src/expre-parser");
function compare(obtained, expected) {
    try {
        discrepances.showAndThrow(obtained, expected);
    }
    catch (err) {
        console.log('ERROR FORMATO 1');
        console.log(JSON.stringify(discrepances.nestedObject(obtained, expected)));
        console.log('ERROR FORMATO 2');
        console.log(JSON.stringify(discrepances.flatten(obtained, expected)));
        throw err;
    }
}
describe("expre-parser", function () {
    describe("parser", function () {
        it("parse one text", async function () {
            let obtained = ExpreParser.parse("'a'");
            let expected = { type: 'literal', mainContent: "'a'", value: 'a', dataType: 'string' };
            compare(obtained, expected);
        });
        it("parse one operator", async function () {
            let obtained = ExpreParser.parse("4+a");
            let expected = {
                type: 'binoperator',
                mainContent: '+',
                children: [
                    { type: 'literal', mainContent: '4', value: 4, dataType: 'number' },
                    { type: 'identifier', mainContent: 'a' },
                ]
            };
            compare(obtained, expected);
        });
        it("parse function call", async function () {
            let obtained = ExpreParser.parse("f(t.field)");
            let expected = {
                type: 'function',
                mainContent: "f",
                children: [
                    { type: 'identifier', mainContent: 't.field' }
                ]
            };
            compare(obtained, expected);
        });
    });
    describe("wrapped", function () {
        var compilerOptions = {
            varWrapper: 'var'
        };
        var compiler;
        before(function () {
            compiler = ExpreParser.compiler(compilerOptions);
        });
        it('wrap varname', function () {
            let obtained = compiler.toPostgres(ExpreParser.parse("f(t.field)"), 'pk1');
            let expected = "f(var(t.field))";
            compare(obtained, expected);
        });
    });
    describe("non wrapped", function () {
        var compilerOptions = {
            varWrapper: false
        };
        var compiler;
        before(function () {
            compiler = ExpreParser.compiler(compilerOptions);
        });
        it('simple expressions toPostgres', function () {
            let obtained = compiler.toPostgres(ExpreParser.parse("a+b>c and b is null"), 'pk1');
            let expected = "a+b>c and b is null";
            compare(obtained, expected);
        });
        it('simple expressions toJavascript', function () {
            let obtained = compiler.toJavascript(ExpreParser.parse("a+b>c and b is null"), 'pk1');
            let expected = "a+b>c && b == null";
            compare(obtained, expected);
        });
    });
});
process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});
//# sourceMappingURL=test-simples.js.map