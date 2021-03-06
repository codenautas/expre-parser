import * as sqliteParser from 'sqlite-parser';

import 'mocha';
import * as discrepances from 'discrepances';

import * as EPModel from '../src/ast-model';
import { CompilerOptions, Compiler } from '../src/compiler';
import * as ExpresionParser from '../src/expre-parser';
// import { strict as assert } from "assert";

function compare<T>(obtained: T, expected: T, opts?: object) {
    try {
        // assert.deepEqual(obtained, expected);
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
            let obtained = ExpresionParser.parse(43) as EPModel.LiteralNode;
            let expectedParsed = new EPModel.LiteralNode(<sqliteParser.LiteralNode>{ type: 'literal', value: "43", variant: 'decimal' })
            // es llamado `jsonObj` en lugar de `LiteralObj` u `objLiteral` para no confundir el `literal` de objetos JS con nuestro LiteralNode de AST
            let expectedJsonObj = <EPModel.LiteralNode>{ type: 'literal', dataType: 'decimal', mainContent: "43" };
            compare(obtained, expectedJsonObj, { duckTyping: true });
            compare(obtained, expectedParsed);
            obtained = expectedParsed; //assignation to TS type check            
        });
        it("parse one text", async function () {
            let obtained = ExpresionParser.parse("'hello world'") as EPModel.LiteralNode;
            let expectedParsed = new EPModel.LiteralNode({ type: 'literal', value: "hello world", variant: 'text' })
            let expectedJsonObj = <EPModel.LiteralNode>{ type: 'literal', dataType: 'text', mainContent: 'hello world' }
            compare(obtained, expectedJsonObj, { duckTyping: true });
            compare(obtained, expectedParsed);
            obtained = expectedParsed; //assignation to TS type check   
        });
        it("parse one variable", async function () {
            let obtained = ExpresionParser.parse("t.c") as EPModel.IdentifierNode;
            let expectedParsed = new EPModel.IdentifierNode({ type: 'identifier', name: "t.c" });
            let expectedJsonObj = <EPModel.IdentifierNode>{ type: 'identifier', mainContent: 't.c', alias: 't'}
            compare(obtained, expectedJsonObj, { duckTyping: true });
            compare(obtained, expectedParsed);
            obtained = expectedParsed; //assignation to TS type check   
        });
        it("parse one function", async function () {
            let obtained = ExpresionParser.parse("f(33)") as EPModel.FunctionExpressionNode;
            let expectedParsed = new EPModel.FunctionExpressionNode({ type: 'function', name: { type: 'identifier', name: "f" }, args: { expression: [<sqliteParser.LiteralNode>{ type: 'literal', value: '33', variant: 'decimal' }] } });
            let expectedJsonObj: object = { type: "function", mainContent: "f", children: [{ type: "literal", mainContent: "33", dataType: "decimal" }] }
            compare(obtained, expectedJsonObj, { duckTyping: true });
            compare(obtained, expectedParsed);
            obtained = expectedParsed; //assignation to TS type check   
        });
        it("parse true and false", async function () {
            let obtained = ExpresionParser.parse("f(true, false)") as EPModel.FunctionExpressionNode;
            // TODO arreglar esto:
            // let expectedParsed = new EPModel.FunctionExpressionNode(
            //     {
            //         type: 'function', name: { type: 'identifier', name: "f" },
            //         args: {
            //             expression: [
            //                 <sqliteParser.LiteralNode>{ type: 'literal', value: '33', variant: 'decimal' }]
            //         }
            //     });
            // esto tiene que quedar así:
            let expectedJsonObj: object = {
                type: "function", mainContent: "f", children: [
                    { type: "literal", mainContent: "true", dataType: "boolean" },
                    { type: "literal", mainContent: "false", dataType: "boolean" }
                ]
            }
            compare(obtained, expectedJsonObj, { duckTyping: true });
            // compare(obtained, expectedParsed);
            // obtained = expectedParsed; //assignation to TS type check   
        });
        it("parse one addition", async function () {
            let obtained = ExpresionParser.parse("5+4") as EPModel.BinaryExpressionNode;
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
            // CUANDO ARREGLEN EL NOT let obtained = ExpresionParser.parse("'a'+'b' = 6 AND fun(a,b,c) AND not f(3) OR 6/2 is 3") as EPModel.BinaryExpressionNode;
            let obtained = ExpresionParser.parse("'a'+'b' = 6 AND fun(a,b,c) AND not (f(3)) OR 6/2 is 3") as EPModel.BinaryExpressionNode;
            // let expectedParsed = new EP.BinaryExpressionNode(<sqliteParser.BinaryExpressionNode>{put here the json in format sqliteParser.BinaryExpressionNode});
            let expectedJsonObj: object = { type: "binary", mainContent: "or", children: [{ type: "binary", mainContent: "and", children: [{ type: "binary", mainContent: "and", children: [{ type: "binary", mainContent: "=", children: [{ type: "binary", mainContent: "+", children: [{ type: "literal", mainContent: "a", dataType: "text" }, { type: "literal", mainContent: "b", dataType: "text" }] }, { type: "literal", mainContent: "6", dataType: "decimal" }] }, { type: "function", mainContent: "fun", children: [{ type: "identifier", mainContent: "a" }, { type: "identifier", mainContent: "b" }, { type: "identifier", mainContent: "c" }] }] }, { type: "unary", mainContent: "not", children: [{ type: "function", mainContent: "f", children: [{ type: "literal", mainContent: "3", dataType: "decimal" }] }] }] }, { type: "binary", mainContent: "is", children: [{ type: "binary", mainContent: "/", children: [{ type: "literal", mainContent: "6", dataType: "decimal" }, { type: "literal", mainContent: "2", dataType: "decimal" }] }, { type: "literal", mainContent: "3", dataType: "decimal" }] }] }
            compare(obtained, expectedJsonObj, { duckTyping: true });
            // // compare(obtained, expectedParsed);
            // obtained = expectedParsed; //assignation to TS type check   
        });
    });
    describe("protesta la librería sqlite_parse con SQL inválidos, por ej: delete, drop, etc", function () {
        it("cualquier cosa", async function () {
            ['&','pe#p','delete','@','FROM','!', '==','%', 'drop', 'if ('].forEach(invalExp => {
                try {
                    ExpresionParser.sqlite_parse(invalExp) as EPModel.LiteralNode;
                    throw new Error('Tenía que dar error, porque la expresion "'+invalExp+'" es sintaxis inválida');
                } catch(err){
                    discrepances.showAndThrow(err.message, 'La expresion '+JSON.stringify(invalExp)+' no es valida');
                }
            })
        });
    });
    describe("protesta convertNode() porque el usario escribio SQL válido para sqlite-parser que no consideramos válido, por ej: ?, etc ", function () {
        it("cualquier cosa", async function () {
            ['?'].forEach(invalExp => {
                let ast:sqliteParser.BaseNode;
                ast = ExpresionParser.sqlite_parse(invalExp);
                try {
                    ExpresionParser.convertNode(ast);
                    throw new Error('Tenía que dar error porque la expresion "'+invalExp+'" es no la queremos');
                } catch(err){
                    discrepances.showAndThrow(err.message, 'ast.type not consider: '+ ast.type);
                }
            })
        });
        it("cualquier cosa", async function () {
            ['not a', 'a and not b = 3','not (b) and not falseado'].forEach(invalExp => {
                let ast:sqliteParser.BaseNode;
                try {
                    ast = ExpresionParser.sqlite_parse(invalExp);
                    ExpresionParser.convertNode(ast);
                    throw new Error('Tenía que dar error porque la expresion "'+invalExp+'" es no la queremos');
                } catch(err){
                    discrepances.showAndThrow(err.message, `La expresion "${invalExp}" no es valida`);
                }
            })
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
            let obtained = compiler.toCode(ExpresionParser.parse("f(t.field, 33, 'aa', b, '99')"), 'pk1,t2'.split(','));
            let expected = "f(var(t.field), 33, 'aa', var(b), '99')"
            compare(obtained, expected);
        });
        it('wrap simple division', function () {
            let obtained = compiler.toCode(ExpresionParser.parse("7/4"), 'pk1,t2'.split(','));
            let expected = "div(7, 4, pk1::text,t2::text)"
            compare(obtained, expected);
        });
        it('wrap division', function () {
            let obtained = compiler.toCode(ExpresionParser.parse("a/4 > 3 AND t.field/b = 8 OR 3/0 = 1 AND 0/4 < 2"), 'pk1'.split(','));
            let expected = "div(var(a), 4, pk1::text) > 3 and div(var(t.field), var(b), pk1::text) = 8 or div(3, 0, pk1::text) = 1 and div(0, 4, pk1::text) < 2"
            compare(obtained, expected);
        });
    });
    describe("wrapped by functions", function () {
        var compilerOptions: CompilerOptions = {
            varWrapper: (varname:string)=>`vars.${varname}`,
            divWrapper: 'div',
            funWrapper: (funname:string)=>`funs.${funname} `,
            language: 'sql'
        }
        var compiler: Compiler;
        before(function () {
            compiler = new Compiler(compilerOptions);
        });
        it('wrap varname', function () {
            let obtained = compiler.toCode(ExpresionParser.parse("f(t.field, 33, 'aa', b, '99')"), 'pk1,t2'.split(','));
            let expected = "funs.f (vars.t.field, 33, 'aa', vars.b, '99')"
            compare(obtained, expected);
        });
        it('wrap simple division', function () {
            let obtained = compiler.toCode(ExpresionParser.parse("7/4"), 'pk1,t2'.split(','));
            let expected = "div(7, 4, pk1::text,t2::text)"
            compare(obtained, expected);
        });
        it('wrap division', function () {
            let obtained = compiler.toCode(ExpresionParser.parse("a/4 > 3 AND t.field/b = 8 OR 3/0 = 1 AND 0/4 < 2"), 'pk1'.split(','));
            let expected = "div(vars.a, 4, pk1::text) > 3 and div(vars.t.field, vars.b, pk1::text) = 8 or div(3, 0, pk1::text) = 1 and div(0, 4, pk1::text) < 2"
            compare(obtained, expected);
        });
    });
    describe("parse() then toCode() respect precedence order", function () {
        var compilerOptions: CompilerOptions = {
            varWrapper: null,
            divWrapper: null,
            language: 'sql'
        }
        var compiler: Compiler;
        var compilerJs: Compiler;
        before(function () {
            compiler = new Compiler(compilerOptions);
            compilerJs = new Compiler({...compilerOptions, language:'js'})
        });
        it('dont add unuseful parenthesis', function () {
            // CUANDO ARREGLEN EL NOT let obtained = compiler.toCode(ExpresionParser.parse("a and not b or c or d and e"), 'pk1,t2'.split(','));
            let obtained = compiler.toCode(ExpresionParser.parse("a and not (b) or c or d and e"), 'pk1,t2'.split(','));
            let expected = "a and not b or c or d and e"
            compare(obtained, expected);
        });
        it('dont lose parenthesis 2', function () {
            let obtained = compiler.toCode(ExpresionParser.parse("a and not (b or c) or d and e"), 'pk1,t2'.split(','));
            let expected = "a and not (b or c) or d and e"
            compare(obtained, expected);
        });
        it('dont lose parenthesis 2 in JS', function () {
            let obtained = compilerJs.toCode(ExpresionParser.parse("a and not (b or c) or d and e"), 'pk1,t2'.split(','));
            let expected = "a && ! (b || c) || d && e"
            compare(obtained, expected);
        });
        it('dont lose parenthesis 3', function () {
            let obtained = compiler.toCode(ExpresionParser.parse("a and not ((b or c) or d) and e"), 'pk1,t2'.split(','));
            let expected = "a and not (b or c or d) and e"
            compare(obtained, expected);
        });
        it('dont lose parenthesis 4', function () {
            let obtained = compiler.toCode(ExpresionParser.parse("a and (not (b or c) or d) and e"), 'pk1,t2'.split(','));
            let expected = "a and (not (b or c) or d) and e"
            compare(obtained, expected);
        });
        it('dont lose parenthesis 5', function () {
            let obtained = compiler.toCode(ExpresionParser.parse("a and (not (b or c) or d and e)"), 'pk1,t2'.split(','));
            let expected = "a and (not (b or c) or d and e)"
            compare(obtained, expected);
        });
        it('dont lose parenthesis 5 JS', function () {
            let obtained = compilerJs.toCode(ExpresionParser.parse("a and (not (b or c) or d and e)"), 'pk1,t2'.split(','));
            let expected = "a && (! (b || c) || d && e)"
            compare(obtained, expected);
        });
        it('add !() in JS', function () {
            // CUANDO ARREGLEN EL NOT let obtained = compilerJs.toCode(ExpresionParser.parse("a and not b = c or not b <> c"), 'pk1,t2'.split(','));
            let obtained = compilerJs.toCode(ExpresionParser.parse("a and not(b = c) or not (b <> c)"), 'pk1,t2'.split(','));
            let expected = "a && ! (b == c) || ! (b != c)"
            compare(obtained, expected);
        });
        it('not add !() in JS', function () {
            // CUANDO ARREGLEN EL NOT let obtained = compilerJs.toCode(ExpresionParser.parse("a and not b = c or not b <> c"), 'pk1,t2'.split(','));
            let obtained = compilerJs.toCode(ExpresionParser.parse("not (a) and not(f(b))"), 'pk1,t2'.split(','));
            let expected = "! a && ! f(b)"
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
            let obtained = compiler.toCode(ExpresionParser.parse("a+b>c and b is null"), 'pk1'.split(','));
            let expected = "a + b > c and b is null"
            compare(obtained, expected);
        });
        it('simple expressions toJavascript', function () {
            compilerOptions.language = 'js'
            compiler = new Compiler(compilerOptions);
            // CUANDO ARREGLEN EL NOT let obtained = compiler.toCode(ExpresionParser.parse("(a+b)>c AND b is null OR not t.c"), 'pk2'.split(','));
            let obtained = compiler.toCode(ExpresionParser.parse("(a+b)>c AND b is null OR not (t.c)"), 'pk2'.split(','));
            let expected = "a + b > c && b == null || ! t.c"
            compare(obtained, expected);
        });
        it('parenthesis expression toCode', function () {
            compiler = new Compiler(compilerOptions);
            let obtained = compiler.toCode(ExpresionParser.parse("(a*(b+c)) / (d-(e-g))"), 'pk1'.split(','));
            let expected = "a * (b + c) / (d - (e - g))"
            compare(obtained, expected);
        });
        it('other parenthesis expression toCode', function () {
            compilerOptions.language = 'sql'
            compiler = new Compiler(compilerOptions);
            // CUANDO ARREGLEN EL NOT let obtained = compiler.toCode(ExpresionParser.parse("((a and d) and not (b or not c)) = (a <= 2)"), 'pk1'.split(','));
            let obtained = compiler.toCode(ExpresionParser.parse("((a and d) and not (b or not (c))) = (a <= 2)"), 'pk1'.split(','));
            let expected = "(a and d and not (b or not c)) = (a <= 2)"
            compare(obtained, expected);
        });
        it("parse is not and <>", async function () {
            compilerOptions.language = 'sql'
            compiler = new Compiler(compilerOptions);
            let obtained = compiler.toCode(ExpresionParser.parse("b is not null and b <> 3"), 'pk2'.split(','));
            let expected = "b is not null and b <> 3"
            compare(obtained, expected);
        });
        it("parse is not and <>", async function () {
            compilerOptions.language = 'js'
            compiler = new Compiler(compilerOptions);
            let obtained = compiler.toCode(ExpresionParser.parse("b is not null and b <> 3"), 'pk2'.split(','));
            let expected = "b != null && b != 3"
            compare(obtained, expected);
        });
        it("inside functions", async function () {
            var expr="f(g(x))+abs(a-1) = f(y) or tiene_permiso('pepe')"
            compilerOptions.language = 'sql'
            compiler = new Compiler(compilerOptions);
            let obtained = compiler.toCode(ExpresionParser.parse(expr), 'pk2'.split(','));
            let expected = "f(g(x)) + abs(a - 1) = f(y) or tiene_permiso('pepe')"
            compare(obtained, expected);
        });
    });
    describe("case", function () {
        var compilerOptions: CompilerOptions = {
            varWrapper: 'vx',
            divWrapper: null,
            elseWrapper: 'without_else',
            language: 'sql'
        }
        var compiler: Compiler;
        it("parse case when else end", async function () {
            compilerOptions.language = 'js'
            compiler = new Compiler(compilerOptions);
            let obtainedTree = ExpresionParser.parse("case when a then 32 else 33 end");
            let expectedTree: object = {
                type: "case", mainContent: null, children: [
                    {
                        type: "when-then-case", mainContent: null, children: [
                            { type: "identifier", mainContent: "a" },
                            { type: "literal", mainContent: "32", dataType: "decimal" },
                        ]
                    },
                    {
                        type: "else-case", mainContent: null, children: [
                            { type: "literal", mainContent: "33", dataType: "decimal" }
                        ]
                    }
                ]
            }
            compare(obtainedTree, expectedTree, { duckTyping: true });
            let obtained = compiler.toCode(obtainedTree, 'pk2'.split(','));
            let expected = "case when vx(a) then 32 else 33 end";
            compare(obtained, expected);
        });
        it("parse case when not else end", async function () {
            compilerOptions.language = 'js'
            compiler = new Compiler(compilerOptions);
            let obtainedTree = ExpresionParser.parse("case when a then 32 end");
            let expectedTree: object = {
                type: "case", mainContent: null, children: [
                    {
                        type: "when-then-case", mainContent: null, children: [
                            { type: "identifier", mainContent: "a" },
                            { type: "literal", mainContent: "32", dataType: "decimal" },
                        ]
                    },
                ]
            }
            compare(obtainedTree, expectedTree, { duckTyping: true });
            let obtained = compiler.toCode(obtainedTree, 'pk1,pk2'.split(','));
            let expected = "case when vx(a) then 32 else without_else(pk1::text,pk2::text) end";
            compare(obtained, expected);
        });
    });
    describe("get used variables, aliases and functions", function () {
        let expression = "fun(tab.a,parse('hello'),3,OTRA_VAR) + 3 * t.c - max(a,min(22,3),o.u) or true";
        let insumos = ExpresionParser.parse(expression).getInsumos();
        it('get variables', function () {
            let obtainedVars: string[] = insumos.variables.sort();
            let expectedVars = ['a', 'o.u', 'otra_var', 't.c', 'tab.a']; //sorted
            discrepances.showAndThrow(obtainedVars, expectedVars);
        });
        it('get aliases', function () {
            let obtainedFunctions: string[] = insumos.aliases.sort();
            let expectedFunctions = ['o', 't', 'tab'];
            discrepances.showAndThrow(obtainedFunctions, expectedFunctions);
        });
        it('get functions', function () {
            let obtainedFunctions: string[] = insumos.funciones.sort();
            let expectedFunctions = ['fun', 'max', 'min', 'parse'];
            discrepances.showAndThrow(obtainedFunctions, expectedFunctions);
        });
    });
});
