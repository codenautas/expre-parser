import * as sqliteParser from "sqlite-parser";
import { ParsedObject, BaseNode as SPBaseNode } from "sqlite-parser";

import { CompilerOptions, Compiler } from "./compiler";
import { BaseNode, LiteralNode, IdentifierNode, FunctionExpressionNode, BinaryExpressionNode, UnaryExpressionNode } from "./ast-model";



// Re-export 'internal' modules to being used externally
export * from './ast-model';
export * from './compiler';

// ########## API #######
export function compileToPostgres(expression: string, opts: CompilerOptions, pkExpression: string): string {
    return (new Compiler(opts)).toCode(parse(expression), pkExpression);
}

export function parse(expression: string): BaseNode {
    // sqliteParser works in expressions with "select" string at begining
    let ast: ParsedObject = sqliteParser('select ' + expression);
    var astStatement: SPBaseNode = ast.statement[0].result[0];
    let node = convertNode(astStatement);
    return node;
}

export function convertNode(ast: SPBaseNode): BaseNode {
    var resultNode: BaseNode;
    // uso switch case porque en sqliteParser.d.ts solo tengo los tipos pero no comportamiento orientado a objetos
    switch (ast.type) {
        case 'literal':
            resultNode = new LiteralNode(<sqliteParser.LiteralNode>ast)
            break;
        case 'identifier':
            resultNode = new IdentifierNode(<sqliteParser.IdentifierNode>ast)
            break;
        case 'function':
            resultNode = new FunctionExpressionNode(<sqliteParser.FunctionNode>ast);
            break;
        case 'expression':
            switch ((ast as sqliteParser.ExpressionNode).format) {
                case 'binary':
                    resultNode = new BinaryExpressionNode(<sqliteParser.BinaryExpressionNode>ast)
                    break;
                case 'unary':
                    resultNode = new UnaryExpressionNode(<sqliteParser.UnaryExpressionNode>ast)
                    break;
                default:
                    break;
            }
            break;
        default:
            break;
    }
    return resultNode;
}
