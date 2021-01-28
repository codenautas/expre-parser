import { BaseNode, LiteralNode, IdentifierNode, BinaryExpressionNode, UnaryExpressionNode, FunctionExpressionNode, CaseExpressionNode, WhenThenCaseNode, ElseCaseNode } from "./ast-model";

export interface CompilerOptions {
    varWrapper?: string | null | ((varname:string)=>string)
    divWrapper?: string | null
    elseWrapper?: string | null
    language?: 'js' | 'sql'
}

export interface CompilerMethods {
    toCode(node: BaseNode, pkExpression?: string[]): string
    unaryToCode(unaryNode: UnaryExpressionNode): string
    binaryToCode(binNode: BinaryExpressionNode): string
    literalToCode(litNode: LiteralNode): string
    baseToCode(node: BaseNode): string
    identifierToCode(idNode: IdentifierNode): string
    functionToCode(funcNode: FunctionExpressionNode): string
}

export class Compiler implements CompilerMethods {
    protected pkExpression?: string; // pk1::text, pk2::text, pk3::text

    constructor(public options: CompilerOptions) {
    }

    wrap(wrapper:undefined|null|string|((expr:string)=>string), expr:string){
        return wrapper == null ? expr :
            typeof wrapper == "string" ? `${wrapper}(${expr})`:
            wrapper(expr);
    }

    toCode(node: BaseNode, pkExpression?: string[]): string {
        /*le agrega a las pks separadas por coma el sufijo ::text para que funcione las funciones
         de postgres que reciben la lista de pks, cuando esa lista es heterogenea (pks de distintos tipos)
         "operativo, id_caso, id_0"  ->  "operativo::text,id_caso::text,id_0::text"
         */
        this.pkExpression = pkExpression? pkExpression.map(pk=>pk.trim()+'::text').join(','): ''; 
        return node.toCodeWiP(this,this);
    }

    functionToCode(funcNode: FunctionExpressionNode): string {
        return this.baseToCode(funcNode) + '(' + funcNode.children.map(child => child.toCodeWiP(this,funcNode)).join(', ') + ')';
    }

    unaryToCode(unaryNode: UnaryExpressionNode): string {
        return this.getOperator(this.baseToCode(unaryNode)) + ' ' + unaryNode.children[0].toCodeWiP(this,unaryNode)
    }

    binaryToCode(binNode: BinaryExpressionNode): string {
        let left = binNode.children[0].toCodeWiP(this, binNode);
        let right = binNode.children[1].toCodeWiP(this, binNode, true)
        if (binNode.mainContent == '/' && this.options.divWrapper) {
            return `${this.options.divWrapper}(${left}, ${right}`+ (this.pkExpression? ', '+this.pkExpression:'') + ')' ;
            // return this.options.divWrapper + '(' + left + ',' + right + ')';
        } else {
            return left + ' ' + this.getOperator(this.baseToCode(binNode)) + ' ' + right;
            // return '(' + left + ' ' + this.getOperator(this.baseToCode(binNode)) + ' ' + right +')';
        }
    }

    caseToCode(caseNode:CaseExpressionNode): string {
        return 'case'+caseNode.children.map(node=>node.toCodeWiP(this,caseNode)).join('')+
            (caseNode.children.length && caseNode.children[caseNode.children.length-1].type!='else-case'?
                ` else ${this.wrap(this.options.elseWrapper, this.pkExpression||'null')}`
            :'')+
            ' end';
    }

    whenThenCaseToCode(caseNode:WhenThenCaseNode): string {
        return ' when '+caseNode.children[0].toCodeWiP(this, caseNode)+
               ' then '+caseNode.children[1].toCodeWiP(this, caseNode);
    }

    elseCaseToCode(caseNode:ElseCaseNode): string {
        return ' else '+caseNode.children[0].toCodeWiP(this,caseNode);
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
        return this.wrap(this.options.varWrapper,this.baseToCode(idNode))
    }

    baseToCode(node: BaseNode): string {
        return node.mainContent;
    }
}