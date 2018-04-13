"use strict";

// https://github.com/codeschool/sqlite-parser/blob/master/src/parser.js (line 1750 aprox)
// also see https://www.sqlite.org/datatype3.html

import * as sqliteParser from "sqlite-parser";
import { ParsedObject, BaseNode as SPBaseNode } from "sqlite-parser";

export interface CompilerOptions {
    varWrapper?: string | null
    divWrapper?: string | null
}

// ########## API class #######
export class ExpresionParser {

    static compileToPostgres(expression: string, opts: CompilerOptions, pkExpression: string): string {
        return (new Compiler(opts)).toPostgres(ExpresionParser.parse(expression), pkExpression);
    }

    static parse(expression: string): BaseNode {
        let ast: ParsedObject = sqliteParser(expression);
        var astStatement: SPBaseNode = ast.statement[0].result[0];
        let node = ExpresionParser.convertNode(astStatement);
        return node;
    }

    static convertNode(ast: SPBaseNode): BaseNode {
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
}

export interface CompileDelegation {
    toPostgres(c: Compiler): any;
}

export abstract class BaseNode implements CompileDelegation {
    constructor(public type: string, public mainContent: string) {
    }
    abstract toPostgres(c: Compiler): any 
}
export class IdentifierNode extends BaseNode {
    constructor(ast: sqliteParser.IdentifierNode) {
        super('identifier', ast.name)
    }
    toPostgres(c: Compiler): string {
        return c.identifierToPostgres(this)
    }
}
export class LiteralNode extends BaseNode {
    dataType: sqliteParser.dataType
    constructor(ast: sqliteParser.LiteralNode) {
        super('literal', ast.value)
        this.dataType = ast.variant
    }
    toPostgres(c: Compiler): any {
        return c.literalToPostgres(this)
    }
}
export abstract class ExpressionNode extends BaseNode {
    children: BaseNode[];
    constructor(type: string = 'expression', mainContent: string, children: sqliteParser.BaseNode[], ) {
        super(type, mainContent);
        this.children = children.map(exp => ExpresionParser.convertNode(exp))
    }
    abstract toPostgres(c: Compiler): any
}
export class BinaryExpressionNode extends ExpressionNode {
    constructor(ast: sqliteParser.BinaryExpressionNode) {
        super('binary', ast.operation, [ast.left, ast.right])
    }
    toPostgres(c: Compiler): any {
        return c.binaryToPostgres(this)
    }
}
export class UnaryExpressionNode extends ExpressionNode {
    constructor(ast: sqliteParser.UnaryExpressionNode) {
        super('unary', ast.operator, [ast.expression])
    }
    toPostgres(c: Compiler): any {
        return c.unaryToPostgres(this)
    }
}
export class FunctionExpressionNode extends ExpressionNode {
    constructor(ast: sqliteParser.FunctionNode) {
        super('function', ast.name.name, ast.args.expression)
    }
    toPostgres(c: Compiler): any {
        return c.functionToPostgres(this)
    }
}

export class Compiler {

    protected pkExpression: string;
    constructor(public options: CompilerOptions) {
    }

    toPostgres(node: BaseNode, pkExpression: string): string {
        this.pkExpression = pkExpression;
        return node.toPostgres(this);
    }

    toJavascript(node: BaseNode): string {
        return node.toJavascript();
    }

    functionToPostgres(funcNode: FunctionExpressionNode): any {
        return this.baseToPostgres(funcNode) + '(' + funcNode.children.map(child => child.toPostgres(this)).join(', ') + ')';
    }
    unaryToPostgres(unaryNode: UnaryExpressionNode): any {
        return this.baseToPostgres(unaryNode) + ' ' + unaryNode.children[0].toPostgres(this)
    }
    binaryToPostgres(binNode: BinaryExpressionNode): any {
        let left = binNode.children[0].toPostgres(this);
        let right = binNode.children[1].toPostgres(this)
        if (binNode.mainContent == '/') {
            return `div(${left}, ${right})`;// return 'div(' + left + ',' + right + ')';
        } else {
            return left + ' ' + this.baseToPostgres(binNode) + ' ' + right
        }
    }
    literalToPostgres(litNode: LiteralNode): string | number {
        let resultVal: string | number;
        switch (litNode.dataType) {
            case 'text':
                resultVal = "'" + this.baseToPostgres(litNode) + "'"
                break;
            case 'decimal':
                resultVal = parseFloat(this.baseToPostgres(litNode))
                break;
            case 'null':
                resultVal = this.baseToPostgres(litNode)
                break;
            default:
                break;
        }
        return resultVal;
    }

    identifierToPostgres(idNode: IdentifierNode): string {
        return !this.options.varWrapper ? this.baseToPostgres(idNode) : this.options.varWrapper + '(' + this.baseToPostgres(idNode) + ')'
    }

    baseToPostgres(node: BaseNode): string {
        return node.mainContent;
    }
}