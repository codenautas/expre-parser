"use strict";

export interface BaseNode{
    type: string,
    mainContent: string
}

export interface LiteralNode extends BaseNode{
    type: "literal"
    mainContent: string
    value: string|number
    dataType: 'string'|'number'
}

export interface IdentifierNode extends BaseNode{
    type: "identifier"
}

export interface InternalNode extends BaseNode{
    children: BaseNode[]
}

export interface BinOperatorNode extends InternalNode{
    type: "binoperator"
    children: [BaseNode,BaseNode]
}

export function parse(expression:string):BaseNode{
    var node:LiteralNode = {type:'literal', mainContent:"'a'", value:'a', dataType:'string'};
    return node;
}

export interface CompilerOptions{
    varWrapper?:string|null
    divWrapper?:string|null
}

export class Compiler{
    constructor(private compilerOptions:CompilerOptions){

    }
    toPostgres(tree:BaseNode, pkExpression:string):string{
        return "not implemented yet"
    }
    toJavascript(tree:BaseNode, pkExpression:string):string{
        return "not implemented yet"
    }
}

export function compiler(compilerOptions:CompilerOptions):Compiler{
    return new Compiler(compilerOptions);
}