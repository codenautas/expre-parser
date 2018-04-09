"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sqliteParser = require("sqlite-parser");
function processTree(ast) {
    console.log('asd');
    return { type: 'asd', mainContent: 'aff' };
    // var returnValue;
    // if (ast.type == 'literal') {
    //     returnValue = isNaN(ast.value) ? ast.value : Number(ast.value);
    // } else if (ast.type == 'identifier') {
    //     returnValue = 'var('+ast.name+')';
    // } else {
    //     var args = ast.args? ast.args.expression: ast.expression? [ast.expression]: [ast.left, ast.right];
    //     args = args.map(function(arg){ return processTree(arg)});
    //     if (ast.type == 'function') {
    //         returnValue = ast.name.name + '(' + args.join(',') + ')' ;
    //     } else {
    //         //recursive call
    //         returnValue = '(' + (ast.format == 'binary'? transformBinaryOperation(ast.operation, args): global.sqlToJsOps[ast.operator] +' '+ args[0]) + ')';
    //     }
    // }
    // return returnValue;
}
function parse(expression) {
    // var node:LiteralNode = {type:'literal', mainContent:"'a'", dataType:'string'};
    var ast = sqliteParser(expression);
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