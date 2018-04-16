"use strict";

// https://github.com/codeschool/sqlite-parser/blob/master/src/parser.js (line 1750 aprox)
// also see https://www.sqlite.org/datatype3.html

import * as sqliteParser from "sqlite-parser";
import { ExpresionParser } from "./expre-parser";
import { Compiler } from "./compiler";

export interface CompileDelegation {
    toCode(c: Compiler): string;
}

export abstract class BaseNode implements CompileDelegation {
    constructor(public type: string, public mainContent: string) {
    }
    abstract toCode(c: Compiler): string
}
export class IdentifierNode extends BaseNode {
    constructor(ast: sqliteParser.IdentifierNode) {
        super('identifier', ast.name)
    }
    toCode(c: Compiler): string {
        return c.identifierToCode(this)
    }
}
export class LiteralNode extends BaseNode {
    dataType: sqliteParser.dataType
    constructor(ast: sqliteParser.LiteralNode) {
        super('literal', ast.value)
        this.dataType = ast.variant
    }
    toCode(c: Compiler): string {
        return c.literalToCode(this)
    }
}
export abstract class ExpressionNode extends BaseNode {
    children: BaseNode[];
    constructor(type: string = 'expression', mainContent: string, children: sqliteParser.BaseNode[], ) {
        super(type, mainContent);
        this.children = children.map(exp => ExpresionParser.convertNode(exp))
    }
    abstract toCode(c: Compiler): string
}
export class BinaryExpressionNode extends ExpressionNode {
    constructor(ast: sqliteParser.BinaryExpressionNode) {
        super('binary', ast.operation, [ast.left, ast.right])
    }
    toCode(c: Compiler): string {
        return c.binaryToCode(this)
    }
}
export class UnaryExpressionNode extends ExpressionNode {
    constructor(ast: sqliteParser.UnaryExpressionNode) {
        super('unary', ast.operator, [ast.expression])
    }
    toCode(c: Compiler): string {
        return c.unaryToCode(this)
    }
}
export class FunctionExpressionNode extends ExpressionNode {
    constructor(ast: sqliteParser.FunctionNode) {
        super('function', ast.name.name, ast.args.expression)
    }
    toCode(c: Compiler): string {
        return c.functionToCode(this)
    }
}
