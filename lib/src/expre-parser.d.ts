export interface BaseNode {
    type: string;
    mainContent: string;
}
export interface LiteralNode extends BaseNode {
    type: "literal";
    dataType: 'text' | 'decimal';
}
export interface IdentifierNode extends BaseNode {
    type: "identifier";
}
export interface ExpressionNode extends BaseNode {
    children: BaseNode[];
}
export interface BinaryExpressionNode extends ExpressionNode {
    children: [BaseNode, BaseNode];
}
export interface UnaryExpressionNode extends ExpressionNode {
    children: [BaseNode];
}
export interface FunctionExpressionNode extends ExpressionNode {
}
export declare function parse(expression: string): BaseNode;
export interface CompilerOptions {
    varWrapper?: string | null;
    divWrapper?: string | null;
}
export declare class Compiler {
    private compilerOptions;
    constructor(compilerOptions: CompilerOptions);
    toPostgres(tree: BaseNode, pkExpression: string): string;
    toJavascript(tree: BaseNode, pkExpression: string): string;
}
export declare function compiler(compilerOptions: CompilerOptions): Compiler;
