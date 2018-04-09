"use strict";

import * as sqliteParser from "sqlite-parser";
import {ParsedObject, BaseNode as SPBaseNode} from "sqlite-parser";

export interface BaseNode{
    type: string,
    mainContent: string
}

export interface LiteralNode extends BaseNode{
    type: "literal"
    dataType: 'text'|'decimal'
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

function processTree(ast:SPBaseNode):BaseNode {
    var returnValue:BaseNode; 
    if (ast.type == 'literal') {
        var literalAst = ast as sqliteParser.LiteralNode
        returnValue = <LiteralNode> {
            type:literalAst.type,
            mainContent: literalAst.value,
            dataType: literalAst.variant,
        }
    } else if (ast.type == 'identifier') {
        let idNode = <sqliteParser.IdentifierNode> ast;
        returnValue = <IdentifierNode> {
            type: idNode.type,
            mainContent: idNode.name
        }
    } else {
        // TODO procesar los tipo expression
        // var args = ast.args? ast.args.expression: ast.expression? [ast.expression]: [ast.left, ast.right];
        // args = args.map(function(arg){ return processTree(arg)});
        // if (ast.type == 'function') {
        //     returnValue = ast.name.name + '(' + args.join(',') + ')' ;
        
        // } else {
        //     //recursive call
        //     returnValue = '(' + (ast.format == 'binary'? transformBinaryOperation(ast.operation, args): global.sqlToJsOps[ast.operator] +' '+ args[0]) + ')';
        // }
    }
    return returnValue;
}

export function parse(expression:string):BaseNode{
    // var node:LiteralNode = {type:'literal', mainContent:"'a'", dataType:'string'};
    let ast:ParsedObject = sqliteParser(expression);
    var astStatement:SPBaseNode = ast.statement[0].result[0];
    let node = processTree(astStatement);
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