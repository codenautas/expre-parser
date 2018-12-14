"use strict";

// https://github.com/codeschool/sqlite-parser/blob/master/src/parser.js (line 1750 aprox)
// also see https://www.sqlite.org/datatype3.html

import * as sqliteParser from "sqlite-parser";
import * as ExpresionParser from "./expre-parser";
import { Compiler } from "./compiler";

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
        if(invokerNode instanceof Compiler){
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
}

export class IdentifierNode extends leafNode {
    alias: string;
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
    getFunciones(): string[] {
        return [this.mainContent].concat(...super.getFunciones());
    }
}
export class CaseExpressionNode extends ExpressionNode {
    constructor(ast:any) {
        super('case', null, ast.expression)
    }
    get precedence(){
        return OUTER_PRECEDENCE;
    }
    toCodeWoP(c: Compiler): string {
        return c.caseToCode(this)
    }
}
export class WhenThenCaseNode extends ExpressionNode {
    constructor(ast:any) {
        super('when-then-case', null, [ast.condition, ast.consequent])
    }
    get precedence(){
        return OUTER_PRECEDENCE;
    }
    toCodeWoP(c: Compiler): string {
        return c.whenThenCaseToCode(this)
    }
}
export class ElseCaseNode extends ExpressionNode {
    constructor(ast:any) {
        super('else-case', null, [ast.consequent])
    }
    get precedence(){
        return OUTER_PRECEDENCE;
    }
    toCodeWoP(c: Compiler): string {
        return c.elseCaseToCode(this)
    }
}
