"use strict";

// https://github.com/codeschool/sqlite-parser/blob/master/src/parser.js (line 1750 aprox)
// also see https://www.sqlite.org/datatype3.html

import * as sqliteParser from "sqlite-parser";
import * as ExpresionParser from "./expre-parser";
import { Compiler } from "./compiler";

export interface Insumos{
     variables: string[]
     aliases: string[]
     funciones: string[] 
}

export abstract class BaseNode {
    constructor(public type: string, public mainContent: string) {
    }

    //must be overriden in concrete subclasses 
    abstract toCode(c: Compiler): string
    abstract getFunciones(): string[]
    abstract getVariables(): string[]
    abstract getAliases(): string[]

    getInsumos(): Insumos {
        // Using Set to remove duplicates
        return {
            variables: Array.from(new Set(
                this.getVariables()
            )),
            aliases: Array.from(new Set(
                this.getAliases()
            )),
            funciones: Array.from(new Set(
                this.getFunciones()
            ))
        };
    }
}

export abstract class leafNode extends BaseNode {
    getFunciones(): string[] {
        return [];
    }
}

export class IdentifierNode extends leafNode {
    alias: string;
    constructor(ast: sqliteParser.IdentifierNode) {
        super('identifier', ast.name);
        if (ast.name.includes('.')) {
            this.alias = ast.name.split('.')[0];
        }
    }
    toCode(c: Compiler): string {
        return c.identifierToCode(this)
    }
    getVariables(): string[] {
        return [this.mainContent];
    }
    getAliases(): string[] {
        return this.alias ? [this.alias] : [];
    }

}
export class LiteralNode extends leafNode {
    dataType: sqliteParser.dataType
    constructor(ast: sqliteParser.LiteralNode) {
        super('literal', ast.value)
        this.dataType = ast.variant
    }
    toCode(c: Compiler): string {
        return c.literalToCode(this)
    }
    getVariables(): string[] {
        return [];
    }
    getAliases(): string[] {
        return [];
    }
}
export abstract class ExpressionNode extends BaseNode {
    children: BaseNode[];
    constructor(type: string, mainContent: string, children: sqliteParser.BaseNode[], ) {
        super(type, mainContent);
        this.children = children.map(exp => ExpresionParser.convertNode(exp))
    }

    getVariables(): string[] {
        return [].concat(...this.children.map(nodo => nodo.getVariables()))
    }
    getAliases(): string[] {
        return [].concat(...this.children.map(nodo => nodo.getAliases()));
    }
    getFunciones(): string[] {
        return [].concat(...this.children.map(nodo => nodo.getFunciones()))
    }

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
    getFunciones(): string[] {
        return [this.mainContent].concat(...super.getFunciones());
    }
}
export class CaseExpressionNode extends ExpressionNode {
    constructor(ast:any) {
        super('case', null, ast.expression)
    }
    toCode(c: Compiler): string {
        return c.caseToCode(this)
    }
}
export class WhenThenCaseNode extends ExpressionNode {
    constructor(ast:any) {
        super('when-then-case', null, [ast.condition, ast.consequent])
    }
    toCode(c: Compiler): string {
        return c.whenThenCaseToCode(this)
    }
}
export class ElseCaseNode extends ExpressionNode {
    constructor(ast:any) {
        super('else-case', null, [ast.consequent])
    }
    toCode(c: Compiler): string {
        return c.elseCaseToCode(this)
    }
}
