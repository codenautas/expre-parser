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
    protected pkExpression: string;

    constructor(public options: CompilerOptions) {
    }

    toCode(node: BaseNode, pkExpression: string): string {
        this.pkExpression = pkExpression;
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
            return `${this.options.divWrapper}(${left}, ${right})`; //placeholder alternative to:
            // return this.options.divWrapper + '(' + left + ',' + right + ')';
        } else {
            return left + ' ' + this.getOperator(this.baseToCode(binNode)) + ' ' + right
        }
    }

    caseToCode(caseNode:CaseExpressionNode): string {
        var pkPart="obtener de la llamada";
        return 'case'+caseNode.children.map(node=>node.toCode(this)).join('')+
            (caseNode.children.length && caseNode.children[caseNode.children.length-1].type!='else-case'?
                `${this.options.elseWrapper}(${pkPart})`
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
        // switch (litNode.dataType) {
        //     case 'text': return "'" + this.baseToCode(litNode) + "'"
        //     case 'decimal': return parseFloat(this.baseToCode(litNode))
        //     case 'null': return this.baseToCode(litNode)
        //     default: return this.baseToCode(litNode)
        // }
        let val = this.baseToCode(litNode);
        return (litNode.dataType == 'text')? "'" + val + "'" : val;
    }

    identifierToCode(idNode: IdentifierNode): string {
        return !this.options.varWrapper ? this.baseToCode(idNode) : this.options.varWrapper + '(' + this.baseToCode(idNode) + ')'
    }

    baseToCode(node: BaseNode): string {
        return node.mainContent;
    }
}