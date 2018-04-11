"use strict";

import * as sqliteParser from "sqlite-parser";
import { ParsedObject, BaseNode as SPBaseNode } from "sqlite-parser";

// https://github.com/codeschool/sqlite-parser/blob/master/src/parser.js (line 1750 aprox)
// also see https://www.sqlite.org/datatype3.html

export class BaseNode {
    constructor(public type: string, public mainContent: string) {
    }
}
export class IdentifierNode extends BaseNode {
    constructor(ast: sqliteParser.IdentifierNode) {
        super('identifier', ast.name)
    }
}
export class LiteralNode extends BaseNode {
    dataType: sqliteParser.dataType
    constructor(ast: sqliteParser.LiteralNode) {
        super('literal', ast.value)
        this.dataType = ast.variant
    }
}
export class ExpressionNode extends BaseNode {
    children: BaseNode[];
    constructor(type: string = 'expression', mainContent: string, children: sqliteParser.BaseNode[], ) {
        super(type, mainContent);
        this.children = children.map(exp => processTree(exp))
    }
}
export class BinaryExpressionNode extends ExpressionNode {
    constructor(ast: sqliteParser.BinaryExpressionNode) {
        super('binary', ast.operation, [ast.left, ast.right])
    }
}
export class UnaryExpressionNode extends ExpressionNode {
    constructor(ast: sqliteParser.UnaryExpressionNode) {
        super('unary', ast.operator, [ast.expression])
    }
}
export class FunctionExpressionNode extends ExpressionNode {
    constructor(ast: sqliteParser.FunctionNode) {
        super('function', ast.name.name, ast.args.expression)
    }
}

function processTree(ast: SPBaseNode): BaseNode {
    var returnValue: BaseNode;
    switch (ast.type) {
        case 'literal':
            returnValue = new LiteralNode(ast as sqliteParser.LiteralNode)
            break;
        case 'identifier':
            returnValue = new IdentifierNode(<sqliteParser.IdentifierNode>ast)
            break;
        case 'function':
            returnValue = new FunctionExpressionNode(<sqliteParser.FunctionNode>ast);
            break;
        case 'expression':
            switch ((ast as sqliteParser.ExpressionNode).format) {
                case 'binary':
                    returnValue = new BinaryExpressionNode(ast as sqliteParser.BinaryExpressionNode)
                    break;
                case 'unary':
                    returnValue = new UnaryExpressionNode(ast as sqliteParser.UnaryExpressionNode)
                    break;
                default:
                    break;
            }
            break;
        default:
            break;
    }
    return returnValue;
}

export interface CompilerOptions {
    varWrapper?: string | null
    divWrapper?: string | null
}

export class Compiler {
    constructor(private compilerOptions: CompilerOptions) {
    }
    toPostgres(node: BaseNode, pkExpression: string): string {
        return 'adsf'
        // if (node.type)

        //     return resultStr;
    }
    toJavascript(tree: BaseNode, pkExpression: string): string {
        return "not implemented yet"
    }
}

export function compiler(compilerOptions: CompilerOptions): Compiler {
    return new Compiler(compilerOptions);
}

export function parse(expression: string): BaseNode {
    let ast: ParsedObject = sqliteParser(expression);
    var astStatement: SPBaseNode = ast.statement[0].result[0];
    let node = processTree(astStatement);
    return node;
}