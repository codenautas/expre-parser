import * as sqliteParser from 'sqlite-parser';

import 'mocha';
import * as discrepances from 'discrepances';

import * as EPModel from '../src/ast-model';
import { CompilerOptions, Compiler } from '../src/compiler';
import { ExpresionParser} from '../src/expre-parser';

function compare<T>(obtained: T, expected: T, opts?: object) {
    try {
        discrepances.showAndThrow(obtained, expected, opts);
    } catch (err) {
        console.log('ERROR FORMATO 1');
        console.log(JSON.stringify(discrepances.nestedObject(obtained, expected)))
        console.log('ERROR FORMATO 2');
        console.log(JSON.stringify(discrepances.flatten(obtained, expected)))
        throw err;
    }
}

describe("expre-parser", function () {
    describe("parser", function () {
        it("parse one number", async function () {
            let obtained = ExpresionParser.parse("select 43") as EPModel.LiteralNode;
            let expectedParsed = new EPModel.LiteralNode(<sqliteParser.LiteralNode>{ type: 'literal', value: "43", variant: 'decimal' })
            // es llamado `jsonObj` en lugar de `LiteralObj` u `objLiteral` para no confundir el `literal` de objetos JS con nuestro LiteralNode de AST
            let expectedJsonObj = <EPModel.LiteralNode>{ type: 'literal', dataType: 'decimal', mainContent: "43" };
            compare(obtained, expectedJsonObj, { duckTyping: true });
            compare(obtained, expectedParsed);
            obtained = expectedParsed; //assignation to TS type check            
        });
        it("parse one text", async function () {
            let obtained = ExpresionParser.parse("select 'hello world'") as EPModel.LiteralNode;
            let expectedParsed = new EPModel.LiteralNode({ type: 'literal', value: "hello world", variant: 'text' })
            let expectedJsonObj = <EPModel.LiteralNode>{ type: 'literal', dataType: 'text', mainContent: 'hello world' }
            compare(obtained, expectedJsonObj, { duckTyping: true });
            compare(obtained, expectedParsed);
            obtained = expectedParsed; //assignation to TS type check   
        });
        it("parse one variable", async function () {
            let obtained = ExpresionParser.parse("select t.c") as EPModel.IdentifierNode;
            let expectedParsed = new EPModel.IdentifierNode({ type: 'identifier', name: "t.c" });
            let expectedJsonObj = <EPModel.IdentifierNode>{ type: 'identifier', mainContent: 't.c' }
            compare(obtained, expectedJsonObj, { duckTyping: true });
            compare(obtained, expectedParsed);
            obtained = expectedParsed; //assignation to TS type check   
        });
        it("parse one function", async function () {
            let obtained = ExpresionParser.parse("select f(33)") as EPModel.FunctionExpressionNode;
            let expectedParsed = new EPModel.FunctionExpressionNode({ type: 'function', name: { type: 'identifier', name: "f" }, args: { expression: [<sqliteParser.LiteralNode>{ type: 'literal', value: '33', variant: 'decimal' }] } });
            let expectedJsonObj: object = { type: "function", mainContent: "f", children: [{ type: "literal", mainContent: "33", dataType: "decimal" }] }
            compare(obtained, expectedJsonObj, { duckTyping: true });
            compare(obtained, expectedParsed);
            obtained = expectedParsed; //assignation to TS type check   
        });
        it("parse one addition", async function () {
            let obtained = ExpresionParser.parse("select 5+4") as EPModel.BinaryExpressionNode;
            let expectedParsed = new EPModel.BinaryExpressionNode({
                type: "expression",
                format: 'binary',
                operation: "+",
                left: <sqliteParser.LiteralNode>{ type: "literal", value: "5", variant: "decimal" },
                right: <sqliteParser.LiteralNode>{ type: "literal", value: "4", variant: "decimal" }
            })
            let expectedJsonObj: object = { type: "binary", mainContent: "+", children: [{ type: "literal", mainContent: "5", dataType: "decimal" }, { type: "literal", mainContent: "4", dataType: "decimal" }] }
            compare(obtained, expectedJsonObj, { duckTyping: true });
            compare(obtained, expectedParsed);
            obtained = expectedParsed; //assignation to TS type check   
        });
        it("parse one complete", async function () {
            let obtained = ExpresionParser.parse("select 'a'+'b' = 6 AND fun(a,b,c) AND not f(3) OR 6/2 is 3") as EPModel.BinaryExpressionNode;
            // let expectedParsed = new EP.BinaryExpressionNode(<sqliteParser.BinaryExpressionNode>{put here the json in format sqliteParser.BinaryExpressionNode});
            let expectedJsonObj: object = { type: "binary", mainContent: "or", children: [{ type: "binary", mainContent: "and", children: [{ type: "binary", mainContent: "and", children: [{ type: "binary", mainContent: "=", children: [{ type: "binary", mainContent: "+", children: [{ type: "literal", mainContent: "a", dataType: "text" }, { type: "literal", mainContent: "b", dataType: "text" }] }, { type: "literal", mainContent: "6", dataType: "decimal" }] }, { type: "function", mainContent: "fun", children: [{ type: "identifier", mainContent: "a" }, { type: "identifier", mainContent: "b" }, { type: "identifier", mainContent: "c" }] }] }, { type: "unary", mainContent: "not", children: [{ type: "function", mainContent: "f", children: [{ type: "literal", mainContent: "3", dataType: "decimal" }] }] }] }, { type: "binary", mainContent: "is", children: [{ type: "binary", mainContent: "/", children: [{ type: "literal", mainContent: "6", dataType: "decimal" }, { type: "literal", mainContent: "2", dataType: "decimal" }] }, { type: "literal", mainContent: "3", dataType: "decimal" }] }] }
            compare(obtained, expectedJsonObj, { duckTyping: true });
            // // compare(obtained, expectedParsed);
            // obtained = expectedParsed; //assignation to TS type check   
        });
    });
    describe("wrapped", function () {
        var compilerOptions: CompilerOptions = {
            varWrapper: 'var',
            divWrapper: 'div',
            language: 'sql'
        }
        var compiler: Compiler;
        before(function () {
            compiler = new Compiler(compilerOptions);
        });
        it('wrap varname', function () {
            let obtained = compiler.toCode(ExpresionParser.parse("select f(t.field, 33, 'aa', b, '99')"), 'pk1');
            let expected = "f(var(t.field), 33, 'aa', var(b), '99')"
            compare(obtained, expected);
        });
        it('wrap simple division', function () {
            let obtained = compiler.toCode(ExpresionParser.parse("select 7/4"), 'pk1');
            let expected = "div(7, 4)"
            compare(obtained, expected);
        });
        it('wrap division', function () {
            let obtained = compiler.toCode(ExpresionParser.parse("select a/4 > 3 AND t.field/b = 8 OR 3/0 = 1 AND 0/4 < 2"), 'pk1');
            let expected = "div(var(a), 4) > 3 and div(var(t.field), var(b)) = 8 or div(3, 0) = 1 and div(0, 4) < 2"
            compare(obtained, expected);
        });
    });
    describe("non wrapped", function () {
        var compilerOptions: CompilerOptions = {
            varWrapper: null,
            divWrapper: null,
            language: 'sql'
        }
        var compiler: Compiler;
        it('simple expressions toCode', function () {
            compiler = new Compiler(compilerOptions);
            let obtained = compiler.toCode(ExpresionParser.parse("select a+b>c and b is null"), 'pk1');
            let expected = "a + b > c and b is null"
            compare(obtained, expected);
        });
        it('simple expressions toJavascript', function () {
            compilerOptions.language='js'
            compiler = new Compiler(compilerOptions);
            let obtained = compiler.toCode(ExpresionParser.parse("select (a+b)>c AND b is null OR not t.c"), 'pk2');
            let expected = "a + b > c && b == null || ! t.c"
            compare(obtained, expected);
        });
        it("parse is not and <>", async function () {
            compilerOptions.language='js'
            compiler = new Compiler(compilerOptions);
            let obtained = compiler.toCode(ExpresionParser.parse("select b is not null and b <> 3"), 'pk2');
            let expected = "b != null && b != 3"
            compare(obtained, expected);
        });
    });
});

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});