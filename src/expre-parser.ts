import * as sqliteParser from "sqlite-parser";
import { BaseNode as SPBaseNode, IdentifierNode as SPIdentifierNode } from "sqlite-parser";

import { BaseNode, LiteralNode, IdentifierNode, FunctionExpressionNode, BinaryExpressionNode, UnaryExpressionNode, CaseExpressionNode, WhenThenCaseNode, ElseCaseNode } from "./ast-model";

// Re-export 'internal' modules to being used externally
export * from './ast-model';
export * from './compiler';

export function sqlite_parse(expression: string|number){
    // sqliteParser works in expressions with "select" string at begining
    try {
        return sqliteParser('select ' + expression).statement[0].result[0];;
    } catch (err){
        throw new Error('La expresion '+expression+' no es válida'); // sintaxis inválida para sqlite-parser
    }
}

export function parse(expression: string|number): BaseNode {
    let ast: sqliteParser.BaseNode = sqlite_parse(expression);
    return convertNode(ast);
}

export function convertNode(ast: SPBaseNode): BaseNode {
    var resultNode: BaseNode;
    // uso switch case porque en sqliteParser.d.ts solo tengo los tipos pero no comportamiento orientado a objetos
    switch (ast.type) {
        case 'literal':
            resultNode = new LiteralNode(<sqliteParser.LiteralNode>ast)
            break;
        case 'identifier':
            //sqlite-parser toma como identifier los literales "true" y "false" -> se convierten a literal
            let idAst = <SPIdentifierNode> ast;
            if (idAst.name == "true" || idAst.name == 'false'){
                resultNode = new LiteralNode({type:'literal', value:idAst.name, variant: 'boolean'})
            } else {
                resultNode = new IdentifierNode(<sqliteParser.IdentifierNode>ast)
            }
            break;
        case 'function':
            resultNode = new FunctionExpressionNode(<sqliteParser.FunctionNode>ast);
            break;
        case 'condition':
            switch ((ast as sqliteParser.ExpressionNode).variant) {
                case 'when':
                    resultNode = new WhenThenCaseNode(ast);
                    break;
                case 'else':
                    resultNode = new ElseCaseNode(ast);
                    break;
            }
            break;
        case 'expression':
            if((ast as sqliteParser.ExpressionNode).variant=='case'){
                resultNode = new CaseExpressionNode(ast)
                break;
            }else{
                switch ((ast as sqliteParser.ExpressionNode).format) {
                    case 'binary':
                        resultNode = new BinaryExpressionNode(<sqliteParser.BinaryExpressionNode>ast)
                        break;
                    case 'unary':
                        resultNode = new UnaryExpressionNode(<sqliteParser.UnaryExpressionNode>ast)
                        break;
                    default:
                        throw new Error("ast.expression not consider: "+ast.type);
                }
            }
            break;
        default:
            throw new Error("ast.type not consider: "+ast.type);
    }
    return resultNode;
}
