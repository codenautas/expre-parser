"use strict";

// https://github.com/codeschool/sqlite-parser/blob/master/src/parser.js (line 1750 aprox)
// also see https://www.sqlite.org/datatype3.html

import * as sqliteParser from "sqlite-parser";
import * as ExpresionParser from "./expre-parser";
import { Compiler } from "./compiler";

// @ts-expect-error ACÁ hay una anomalía porque la mayoría es string, pero algunos no, los que no lo hacen bien!
const NULL_MAIN_CONTENT:string = null;

export var strictOperatorControl=true;

export interface Insumos{
     variables: string[]
     aliases: string[]
     funciones: string[] 
}

export var DEFAULT_PRECEDENCE=90;
export var OUTER_PRECEDENCE=99999999;

// https://www.sqlite.org/lang_expr.html#binaryops
// https://www.postgresql.org/docs/current/sql-syntax-lexical.html#SQL-PRECEDENCE

export var unaryPrecedences:{[key:string]:{precedence:number}}={
    '+':{precedence:120},
    '-':{precedence:120},
    'not':{precedence:360},
    'is true':{precedence:350},
    'is false':{precedence:350},
    'is null':{precedence:350},
    'is not true':{precedence:350},
    'is not false':{precedence:350},
    'is not null':{precedence:350},
    'is not':{precedence:350},
}

export var precedences:{[key:string]:{precedence:number, associative?:true, comparator?:true}}={
    '.'  :{precedence:100},
    '::' :{precedence:110},
    '||' :{precedence:120, associative:true},
    '^':{precedence:130},
    '*':{precedence:140, associative:true},
    '/':{precedence:140},
    '%':{precedence:140},
    '+':{precedence:150, associative:true},
    '-':{precedence:150},
    between:{precedence:200},
    in:{precedence:200},
    like:{precedence:200},
    ilike:{precedence:200},
    similar:{precedence:200},
    '<':{precedence:300},
    '>':{precedence:300},
    '<=':{precedence:300},
    '>=':{precedence:300},
    '<>':{precedence:300},
    '=':{precedence:300},
    is:{precedence:350},
    'is not':{precedence:350},
    'is distinct from':{precedence:350},
    'not':{precedence:360},
    'and':{precedence:370, associative:true},
    'or':{precedence:380, associative:true},
}


export abstract class BaseNode {
    constructor(public type: string, public mainContent: string) {
    }
    //must be overriden in concrete subclasses 
    abstract toCodeWoP(c: Compiler): string
    toCodeWiP(c: Compiler, invokerNode:BaseNode|Compiler, binaryRight?:true): string{
        var result=this.toCodeWoP(c);
        if(invokerNode instanceof Compiler || !this.mayNeedParentheses){
            return result;
        }
        if(invokerNode.precedence<this.precedence 
           || invokerNode.precedence==this.precedence && (binaryRight && !invokerNode.associative)
        ){
            result='('+result+')';
        }
        return result;
    }
    get associative(): boolean{ return false; }
    get mayNeedParentheses(): boolean { return true; }
    abstract get precedence(): number
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
    get mayNeedParentheses(): boolean { return false; }
}

export class IdentifierNode extends leafNode {
    // @ts-expect-error tsc no se da cuenta que mainContent está especificando el tipo de super.mainContent y que recibe un valor != null en super()
    public mainContent: string
    alias: string | undefined;
    constructor(ast: sqliteParser.IdentifierNode) {
        super('identifier', ast.name);
        if (ast.name.includes('.')) {
            this.alias = ast.name.split('.')[0];
        }
    }
    get precedence(){
        return DEFAULT_PRECEDENCE;
    }
    toCodeWoP(c: Compiler): string {
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
    get precedence(){
        return DEFAULT_PRECEDENCE;
    }
    toCodeWoP(c: Compiler): string {
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
        return ([] as string[]).concat(...this.children.map(nodo => nodo.getVariables()))
    }
    getAliases(): string[] {
        return ([] as string[]).concat(...this.children.map(nodo => nodo.getAliases()));
    }
    getFunciones(): string[] {
        return ([] as string[]).concat(...this.children.map(nodo => nodo.getFunciones()))
    }

}
export class BinaryExpressionNode extends ExpressionNode {
    constructor(ast: sqliteParser.BinaryExpressionNode) {
        super('binary', ast.operation, [ast.left, ast.right])
    }
    get precedence(){
        if(!precedences[this.mainContent]){
            console.log("invalid operator "+JSON.stringify(this.mainContent));
            if(strictOperatorControl){
                throw new Error("invalid operator "+JSON.stringify(this.mainContent))
            }else{
                return DEFAULT_PRECEDENCE;
            }
        }
        return precedences[this.mainContent].precedence;
    }
    get associative(): boolean{
        return !!precedences[this.mainContent].associative;
    };
    get isComparation(): boolean{
        return !!precedences[this.mainContent].comparator;
    };
    toCodeWoP(c: Compiler): string {
        return c.binaryToCode(this)
    }
}
export class UnaryExpressionNode extends ExpressionNode {
    constructor(ast: sqliteParser.UnaryExpressionNode) {
        super('unary', ast.operator, [ast.expression])
    }
    get precedence(){
        if(!unaryPrecedences[this.mainContent]){
            console.log("invalid unary operator "+JSON.stringify(this.mainContent))
            if(strictOperatorControl){
                throw new Error("invalid unary operator "+JSON.stringify(this.mainContent))
            }else{
                return DEFAULT_PRECEDENCE;
            }
        }
        return unaryPrecedences[this.mainContent].precedence;
    }
    toCodeWoP(c: Compiler): string {
        return c.unaryToCode(this)
    }
}
export class FunctionExpressionNode extends ExpressionNode {
    constructor(ast: sqliteParser.FunctionNode) {
        super('function', ast.name.name, ast.args.expression)
    }
    get precedence(){
        return OUTER_PRECEDENCE;
    }
    toCodeWoP(c: Compiler): string {
        return c.functionToCode(this)
    }
    get mayNeedParentheses(): boolean { return false; }
    getFunciones(): string[] {
        return [this.mainContent].concat(...super.getFunciones());
    }
}
export class CaseExpressionNode extends ExpressionNode {
    constructor(ast:any) {
        super('case', NULL_MAIN_CONTENT, ast.expression)
    }
    get precedence(){
        return OUTER_PRECEDENCE;
    }
    toCodeWoP(c: Compiler): string {
        return c.caseToCode(this)
    }
    get mayNeedParentheses(): boolean { return false; }
}
export class WhenThenCaseNode extends ExpressionNode {
    constructor(ast:any) {
        super('when-then-case', NULL_MAIN_CONTENT, [ast.condition, ast.consequent])
    }
    get precedence(){
        return OUTER_PRECEDENCE;
    }
    toCodeWoP(c: Compiler): string {
        return c.whenThenCaseToCode(this)
    }
    get mayNeedParentheses(): boolean { return false; }
}
export class ElseCaseNode extends ExpressionNode {
    constructor(ast:any) {
        super('else-case', NULL_MAIN_CONTENT, [ast.consequent])
    }
    get precedence(){
        return OUTER_PRECEDENCE;
    }
    toCodeWoP(c: Compiler): string {
        return c.elseCaseToCode(this)
    }
    get mayNeedParentheses(): boolean { return false; }
}
