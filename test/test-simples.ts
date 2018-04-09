import * as discrepances from 'discrepances';
// import * as fs from 'fs-extra';

import 'mocha';

import * as ExpreParser from '../src/expre-parser';

function compare<T>(obtained:T, expected:T){
    try{
        discrepances.showAndThrow(obtained,expected);
    }catch(err){
        console.log('ERROR FORMATO 1');
        console.log(JSON.stringify(discrepances.nestedObject(obtained,expected)))
        console.log('ERROR FORMATO 2');
        console.log(JSON.stringify(discrepances.flatten(obtained,expected)))
        throw err;
    }
}

describe("expre-parser", function(){
    describe("parser", function(){
        it("parse one text", async function(){
            let obtained = ExpreParser.parse("select 5+4");
            let expected = {type:'literal', mainContent:"'a'", value:'a', dataType:'string'};
            compare(obtained,expected);
        });
        it("parse one operator", async function(){
            let obtained = ExpreParser.parse("select 'a'+'b' = 6 AND fun(a,b,c) AND not f(3) OR 6/2 is 3");
            let expected = {
                type:'binoperator', 
                mainContent:'+',
                children:[
                    {type:'literal', mainContent:'4', value:4, dataType:'number'},
                    {type:'identifier', mainContent:'a'},
                ]
            }
            compare(obtained,expected);
        });
        it("parse function call", async function(){
            let obtained = ExpreParser.parse("f(t.field)");
            let expected = {
                type:'function', 
                mainContent:"f",
                children:[
                    {type:'identifier', mainContent:'t.field'}
                ]
            };
            compare(obtained,expected);
        });
    });    
    describe("wrapped", function(){
        var compilerOptions={
            varWrapper:'var',
            divWrapper:'div'
        }
        var compiler:ExpreParser.Compiler;
        before(function(){
            compiler = ExpreParser.compiler(compilerOptions);
        });
        it('wrap varname',function(){
            let obtained = compiler.toPostgres(ExpreParser.parse("f(t.field)"),'pk1');
            let expected = "f(var(t.field))"
            compare(obtained,expected);
        });
    });
    describe("non wrapped", function(){
        var compilerOptions:ExpreParser.CompilerOptions={
            varWrapper:null,
            divWrapper:null
        }
        var compiler:ExpreParser.Compiler;
        before(function(){
            compiler = ExpreParser.compiler(compilerOptions);
        });
        it('simple expressions toPostgres',function(){
            let obtained = compiler.toPostgres(ExpreParser.parse("a+b>c and b is null"),'pk1');
            let expected = "a+b>c and b is null"
            compare(obtained,expected);
        });
        it('simple expressions toJavascript',function(){
            let obtained = compiler.toJavascript(ExpreParser.parse("a+b>c and b is null"),'pk1');
            let expected = "a+b>c && b == null"
            compare(obtained,expected);
        });
    });
});    

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});