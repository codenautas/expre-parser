"use strict";

import * as sqliteParser from "sqlite-parser";
import { ParsedObject, BaseNode as SPBaseNode } from "sqlite-parser";

export interface BaseNode {
    type: string,
    mainContent: string
}
export interface LiteralNode extends BaseNode {
    type: "literal"
    dataType: 'text' | 'decimal'
}
export interface IdentifierNode extends BaseNode {
    type: "identifier"
}

export interface ExpressionNode extends BaseNode {
    children: BaseNode[]
}
export interface BinaryExpressionNode extends ExpressionNode {
    children: [BaseNode, BaseNode]
}
export interface UnaryExpressionNode extends ExpressionNode {
    children: [BaseNode]
}
export interface FunctionExpressionNode extends ExpressionNode {

}

function processTree(ast: SPBaseNode): BaseNode {
    var returnValue: BaseNode;
    if (ast.type == 'literal') {
        var literalAst = ast as sqliteParser.LiteralNode
        returnValue = <LiteralNode>{
            type: literalAst.type,
            mainContent: literalAst.value,
            dataType: literalAst.variant,
        }
    } else if (ast.type == 'identifier') {
        let idNode = <sqliteParser.IdentifierNode>ast;
        returnValue = <IdentifierNode>{
            type: idNode.type,
            mainContent: idNode.name
        }
    } else if (ast.type == 'function') {
        let functionNode = <sqliteParser.FunctionNode>ast;
        returnValue = <FunctionExpressionNode>{
            type: functionNode.type,
            mainContent: functionNode.name.name,
            children: functionNode.args.expression.map(exp => processTree(exp))
        }
    } else if (ast.type == 'expression') {
        let expressionAst:sqliteParser.BinaryExpressionNode | sqliteParser.UnaryExpressionNode;
        let children:sqliteParser.BaseNode[];
        if ((<sqliteParser.ExpressionNode>ast).format == 'binary') {
            expressionAst = ast as sqliteParser.BinaryExpressionNode;
            children = [expressionAst.left, expressionAst.right]
        } else { //unary
            expressionAst = <sqliteParser.UnaryExpressionNode>ast;
            children = [expressionAst.expression]
        }
        returnValue = <ExpressionNode>{
            type: expressionAst.format,
            mainContent: expressionAst.operation,
            children: children.map(exp => processTree(exp))
        }
    }
    return returnValue;
}

export function parse(expression: string): BaseNode {
    // var node:LiteralNode = {type:'literal', mainContent:"'a'", dataType:'string'};
    let ast: ParsedObject = sqliteParser(expression);
    var astStatement: SPBaseNode = ast.statement[0].result[0];
    let node = processTree(astStatement);
    return node;
}

export interface CompilerOptions {
    varWrapper?: string | null
    divWrapper?: string | null
}

export class Compiler {
    constructor(private compilerOptions: CompilerOptions) {

    }
    toPostgres(tree: BaseNode, pkExpression: string): string {
        return "not implemented yet"
    }
    toJavascript(tree: BaseNode, pkExpression: string): string {
        return "not implemented yet"
    }
}

export function compiler(compilerOptions: CompilerOptions): Compiler {
    return new Compiler(compilerOptions);
}