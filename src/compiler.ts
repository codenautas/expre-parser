import { BaseNode, LiteralNode, IdentifierNode, BinaryExpressionNode, UnaryExpressionNode, FunctionExpressionNode, CaseExpressionNode, WhenThenCaseNode, ElseCaseNode } from "./ast-model";

export interface CompilerOptions {
    varWrapper?: string | null
    divWrapper?: string | null
    elseWrapper?: string | null
    language?: 'js' | 'sql'
}

export interface CompilerMethods {
    toCode(node: BaseNode, pkExpression: string): string
    unaryToCode(unaryNode: UnaryExpressionNode): string
    binaryToCode(binNode: BinaryExpressionNode): string
    literalToCode(litNode: LiteralNode): string
    baseToCode(node: BaseNode): string
    identifierToCode(idNode: IdentifierNode): string
    functionToCode(funcNode: FunctionExpressionNode): string
}

export class Compiler implements CompilerMethods {
    protected pkExpression: string; // pk1::text, pk2::text, pk3::text

    constructor(public options: CompilerOptions) {
    }

    toCode(node: BaseNode, pkExpression: string): string {
        /*le agrega a las pks separadas por coma el sufijo ::text para que funcione las funciones
         de postgres que reciben la lista de pks, cuando esa lista es heterogenea (pks de distintos tipos)
         "operativo, id_caso, id_0"  ->  "operativo::text,id_caso::text,id_0::text"
         */
        this.pkExpression = pkExpression? pkExpression.split(',').map(pk=>pk.trim()+'::text').join(','): ''; 
        return node.toCode(this);
    }
    functionToCode(funcNode: FunctionExpressionNode): string {
        return this.baseToCode(funcNode) + '(' + funcNode.children.map(child => child.toCode(this)).join(', ') + ')';
    }

    unaryToCode(unaryNode: UnaryExpressionNode): string {
        return this.getOperator(this.baseToCode(unaryNode)) + ' ' + unaryNode.children[0].toCode(this)
    }

    binaryToCode(binNode: BinaryExpressionNode): string {
        let left = binNode.children[0].toCode(this);
        let right = binNode.children[1].toCode(this)
        if (binNode.mainContent == '/' && this.options.divWrapper) {
            return `${this.options.divWrapper}(${left}, ${right}`+ (this.pkExpression? ', '+this.pkExpression:'') + ')' ;
            // return this.options.divWrapper + '(' + left + ',' + right + ')';
        } else {
            return left + ' ' + this.getOperator(this.baseToCode(binNode)) + ' ' + right
        }
    }

    caseToCode(caseNode:CaseExpressionNode): string {
        return 'case'+caseNode.children.map(node=>node.toCode(this)).join('')+
            (caseNode.children.length && caseNode.children[caseNode.children.length-1].type!='else-case'?
                ` else ${this.options.elseWrapper}(${this.pkExpression})`
            :'')+
            ' end';
    }

    whenThenCaseToCode(caseNode:WhenThenCaseNode): string {
        return ' when '+caseNode.children[0].toCode(this)+
               ' then '+caseNode.children[1].toCode(this);
    }

    elseCaseToCode(caseNode:ElseCaseNode): string {
        return ' else '+caseNode.children[0].toCode(this);
    }

    getOperator(operator: string): string {
        if (this.options.language == 'sql') {
            return operator
        }
        // Javascript language
        switch (operator) {
            case 'and': return '&&'
            case 'or': return '||'
            case 'not': return '!'
            case 'is': return '=='
            case '=': return '=='
            case '<>': return '!='
            case 'is not': return '!='
            default: return operator // common sql/js operators: + - < > / * 
        }
    }

    literalToCode(litNode: LiteralNode): string {
        let val = this.baseToCode(litNode);
        // switch (litNode.dataType) {
        //     case 'text': return "'" + val + "'"
        //     case 'decimal': return parseFloat(val)
        //     case 'null': return val
        //     default: return val
        // }
        return (litNode.dataType == 'text')? "'" + val + "'" : val;
    }

    identifierToCode(idNode: IdentifierNode): string {
        return !this.options.varWrapper ? this.baseToCode(idNode) : this.options.varWrapper + '(' + this.baseToCode(idNode) + ')'
    }

    baseToCode(node: BaseNode): string {
        return node.mainContent;
    }
}