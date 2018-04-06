"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function parse(expression) {
    var node = { type: 'literal', mainContent: "'a'", value: 'a', dataType: 'string' };
    return node;
}
exports.parse = parse;
class Compiler {
    toPostgres(tree, pkExpression) {
    }
    toJavascript(tree, pkExpression) {
    }
}
exports.Compiler = Compiler;
function compiler(compilerOptions) {
    return new Compiler(compilerOptions);
}
exports.compiler = compiler;
//# sourceMappingURL=expre-parser.js.map