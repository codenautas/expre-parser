import * as discrepances from 'discrepances';
// import * as fs from 'fs-extra';

import 'mocha';

import * as EP from '../src/expre-parser';
import * as sqliteParser from 'sqlite-parser';

function compare<T>(obtained: T, expected: T) {
    try {
        discrepances.showAndThrow(obtained, expected);
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
            let obtained = EP.parse("select 43") as EP.LiteralNode;
            let entry:sqliteParser.LiteralNode = {type: 'literal', value: "43", variant:'decimal'}
            let expected = new EP.LiteralNode(entry)
            compare(obtained.type, 'literal')
            compare(obtained.mainContent, entry.value)
            compare(obtained.dataType, entry.variant)
            //Se podria usar flaten en lugar de compare para comprar contenido (sin hacer todo eso)
            compare(obtained, expected);
            obtained = expected;
        });
        it("parse one text", async function () {
            let obtained = EP.parse("select 'hello world'") as EP.LiteralNode;
            let entry:sqliteParser.LiteralNode = {type: 'literal', value: "hello world", variant:'text'}
            let expected = new EP.LiteralNode(entry)
            compare(obtained.type, 'literal')
            compare(obtained.mainContent, entry.value)
            compare(obtained.dataType, entry.variant)
            compare(obtained, expected);
            obtained = expected;
        });
        it("parse one variable", async function () {
            let obtained = EP.parse("select t.c")  as EP.IdentifierNode;
            let entry:sqliteParser.IdentifierNode = { type: 'identifier', name: "t.c" }
            let expected = new EP.IdentifierNode(entry);
            compare(obtained.type, 'identifier')
            compare(obtained.mainContent, entry.name)
            compare(obtained, expected);
            obtained = expected;
        });
        it("parse one function", async function () {
            let obtained = EP.parse("select f(33)") as EP.FunctionExpressionNode;
            let entry: sqliteParser.FunctionNode = { type: 'function', name: {type: 'identifier', name: "f"}, args: { expression: [<sqliteParser.LiteralNode>{ type: 'literal', value: '33', variant: 'decimal' }]} };
            let expected = new EP.FunctionExpressionNode(entry);
            compare(obtained.type, 'function')
            compare(obtained.mainContent, entry.name.name)
            compare(obtained.children.length, 1)
            compare(obtained, expected);
            obtained = expected;
        });
        it("parse one addition", async function () {
            let obtained = EP.parse("select 5+4") as EP.BinaryExpressionNode;
            let entry: sqliteParser.BinaryExpressionNode = {
                type: "expression",
                format: 'binary',
                operation: "+",
                left: <sqliteParser.LiteralNode>{ type: "literal", value: "5", variant: "decimal" },
                right: <sqliteParser.LiteralNode>{ type: "literal", value: "4", variant: "decimal" }
            }
            let expected = new EP.BinaryExpressionNode(entry)
            compare(obtained.type, 'binary')
            compare(obtained.mainContent, '+')
            compare(obtained.children.length, 2)
            compare(obtained.children[0].type, 'literal')
            compare(obtained.children[1].mainContent, '4')
            compare(obtained, expected);
            obtained = expected;
        });
        it("parse one complete", async function () {
            let obtained = EP.parse("select 'a'+'b' = 6 AND fun(a,b,c) AND not f(3) OR 6/2 is 3");
            let expected = {
                type: "binary",
                mainContent: "or",
                children: [
                    {
                        type: "binary", mainContent: "and", children: [
                            {
                                type: "binary", mainContent: "and", children: [
                                    {
                                        type: "binary", mainContent: "=", children: [
                                            {
                                                type: "binary", mainContent: "+", children: [
                                                    { type: "literal", mainContent: "a", dataType: "text" },
                                                    { type: "literal", mainContent: "b", dataType: "text" }
                                                ]
                                            },
                                            { type: "literal", mainContent: "6", dataType: "decimal" }
                                        ]
                                    },
                                    {
                                        type: "function", mainContent: "fun", children: [
                                            { type: "identifier", mainContent: "a" },
                                            { type: "identifier", mainContent: "b" },
                                            { type: "identifier", mainContent: "c" }]
                                    }]
                            },
                            {
                                type: "unary", mainContent:"not", children: [
                                    {
                                        type: "function", mainContent: "f", children: [
                                            { type: "literal", mainContent: "3", dataType: "decimal" }
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        type: "binary", mainContent: "is", children: [
                            {
                                type: "binary", mainContent: "/", children: [
                                    { type: "literal", mainContent: "6", dataType: "decimal" },
                                    { type: "literal", mainContent: "2", dataType: "decimal" }
                                ]
                            },
                            { type: "literal", mainContent: "3", dataType: "decimal" }
                        ]
                    }]
            }
            discrepances.flatten(obtained, expected);
            obtained = expected;
        });
    });
    describe("wrapped", function () {
        var compilerOptions = {
            varWrapper: 'var',
            divWrapper: 'div'
        }
        var compiler: EP.Compiler;
        before(function () {
            compiler = EP.compiler(compilerOptions);
        });
        it('wrap varname', function () {
            let obtained = compiler.toPostgres(EP.parse("f(t.field)"), 'pk1');
            let expected = "f(var(t.field))"
            compare(obtained, expected);
        });
    });
    describe("non wrapped", function () {
        var compilerOptions: EP.CompilerOptions = {
            varWrapper: null,
            divWrapper: null
        }
        var compiler: EP.Compiler;
        before(function () {
            compiler = EP.compiler(compilerOptions);
        });
        it.skip('simple expressions toPostgres', function () {
            let obtained = compiler.toPostgres(EP.parse("a+b>c and b is null"), 'pk1');
            let expected = "a+b>c and b is null"
            compare(obtained, expected);
        });
        it.skip('simple expressions toJavascript', function () {
            let obtained = compiler.toJavascript(EP.parse("a+b>c and b is null"), 'pk1');
            let expected = "a+b>c && b == null"
            compare(obtained, expected);
        });
    });
});

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});