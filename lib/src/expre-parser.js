"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sqliteParser = require("sqlite-parser");
function processTree(ast) {
    var returnValue;
    if (ast.type == 'literal') {
        var literalAst = ast;
        returnValue = {
            type: literalAst.type,
            mainContent: literalAst.value,
            dataType: literalAst.variant,
        };
    }
    else if (ast.type == 'identifier') {
        let idNode = ast;
        returnValue = {
            type: idNode.type,
            mainContent: idNode.name
        };
    }
    else if (ast.type == 'function') {
        let functionNode = ast;
        returnValue = {
            type: functionNode.type,
            mainContent: functionNode.name.name,
            children: functionNode.args.expression.map(exp => processTree(exp))
        };
    }
    else if (ast.type == 'expression') {
        let expressionAst;
        let children;
        if (ast.format == 'binary') {
            expressionAst = ast;
            children = [expressionAst.left, expressionAst.right];
        }
        else {
            expressionAst = ast;
            children = [expressionAst.expression];
        }
        returnValue = {
            type: expressionAst.format,
            mainContent: expressionAst.operation,
            children: children.map(exp => processTree(exp))
        };
    }
    return returnValue;
}
function parse(expression) {
    // var node:LiteralNode = {type:'literal', mainContent:"'a'", dataType:'string'};
    let ast = sqliteParser(expression);
    var astStatement = ast.statement[0].result[0];
    let node = processTree(astStatement);
    return node;
}
exports.parse = parse;
class Compiler {
    constructor(compilerOptions) {
        this.compilerOptions = compilerOptions;
    }
    toPostgres(tree, pkExpression) {
        return "not implemented yet";
    }
    toJavascript(tree, pkExpression) {
        return "not implemented yet";
    }
}
exports.Compiler = Compiler;
function compiler(compilerOptions) {
    return new Compiler(compilerOptions);
}
exports.compiler = compiler;
//# sourceMappingURL=expre-parser.js.map