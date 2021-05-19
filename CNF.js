"use strict"

function AbstractBooleanOperation(evaluateFunction, sign, ...operands) {
    this.evaluateFunction = evaluateFunction;
    this.sign = sign;
    this.operands = operands;
}
AbstractBooleanOperation.prototype.addOperand = function(newOperand) {
    this.operands.push(newOperand);
}
AbstractBooleanOperation.prototype.toString = function() {
    if (this.operands.length == 0)
        return "()"
    let ans = "(";
    ans += this.operands[0];
    for (let i = 1; i < this.operands.length; ++i)
        ans += " " + this.sign + " " + this.operands[i];
    ans += ")";
    return ans;    
}
AbstractBooleanOperation.prototype.evaluate = function(argsMap) {
    let evaluatedOperands = this.operands.map(function(el){
        return el.evaluate(argsMap);
    });

    
    return evaluatedOperands.reduce(this.evaluateFunction);
}


function BoolAnd(...operands) {
    AbstractBooleanOperation.call(this, (l, r) => l && r, "&", ...operands);
}
BoolAnd.prototype = Object.create(AbstractBooleanOperation.prototype);

function BoolOr(...operands) {
    AbstractBooleanOperation.call(this, (l, r) => l || r, "|", ...operands);
}
BoolOr.prototype = Object.create(AbstractBooleanOperation.prototype);

function BoolXor(...operands) {
    AbstractBooleanOperation.call(this, (l, r) => l ^ r, "^", ...operands);
}
BoolXor.prototype = Object.create(AbstractBooleanOperation.prototype);

function Constant(val) {
    this.val = val;
    this.toString = function () {
        return (this.val ? "1" : "0");
    }
    this.evaluate = function(argsMap) {
        return this.val;
    }
}

function BoolNot(val) {
    this.val = val;
    this.toString = function() {
        return "!" + val.toString();
    }
    this.evaluate = function(argsMap) {
        return !this.val.evaluate(argsMap);
    }
}

function Variable(val) {
    this.val = val;
    this.toString = function() {
        return val;
    }
    this.evaluate = function (argsMap) {
        return argsMap[val];
    }
}

let Variables = [];
let VariablesMap = {};
let CNF = new BoolAnd();
let mainExpr = {};

function reset() {
    Variables = [];
    VariablesMap = {};
    CNF = new BoolAnd();
    mainExpr = {};
}

function addNewConjunct(booleanCombination) {
    let conjunct = new BoolOr();
    for (let i = 0; i < booleanCombination.length; i++) {
    
        if (booleanCombination[i]) {
            conjunct.addOperand(new BoolNot(new Variable(Variables[i])))
        } else {
            conjunct.addOperand(new Variable(Variables[i]));
        }

    }
    CNF.addOperand(conjunct);
}

function testForConjunct(booleanCombination) {
    for (let i = 0; i < booleanCombination.length; i++)
        VariablesMap[Variables[i]] = booleanCombination[i];   
    if (!mainExpr.evaluate(VariablesMap))
        addNewConjunct(booleanCombination);
}

function genCombination(curr) {
    function StringSource (str) {
    this.str = str;
    this.curr = 0;
    this.hasNext = () => this.curr < this.str.length;
    this.next = () => this.str[this.curr++];
    }
    if (curr.length == Variables.length) {
        testForConjunct(curr); 
        return;           
    }
    curr.push(0);
    genCombination(curr);
    curr.pop();
    curr.push(1);
    genCombination(curr);
}

Variables = ["a", "b", "c"]
mainExpr = new BoolOr(new BoolAnd(new Variable("a"), new Variable("b")), new BoolNot(new Variable("c")))
genCombination([]);
console.log(CNF.toString())


//----------------------------ParserSection----------------------
function StringSource (str) {
    this.str = str;
    this.curr = 0;
   
    this.hasNext = () => this.curr < this.str.length;
    this.next = () => this.str[this.curr++];
}

//----------------------------BaseParser---------------------------------//
function BaseParser (expressionSource) {
    if (expressionSource.constructor.name !== "StringSource")
        throw new Error("Provided not StringSource to BaseParser");
    this.source = expressionSource;
    this.ch = null;
}
BaseParser.prototype.nextChar = function() {
    this.ch = this.source.hasNext() ? this.source.next() : '\0';
}
BaseParser.prototype.test = function(testVal) {
    if (this.ch === testVal) {
        this.nextChar();
        return true;
    }
    return false;
}

BaseParser.prototype.between = function(l, r) {
    return l <= this.ch &&  this.ch <= r;
}
BaseParser.prototype.isVariable = function() {
    return this.between('a', 'z');
}
BaseParser.prototype.skipWhiteSpaces = function() {
    let isWhiteSpace = (ch) => ch ===' ';
    while(isWhiteSpace(this.ch)) {
        this.nextChar();
    }
}   

//----------------------------ExpressionParser--------------------
function ExpressionParser(strSource) {
    BaseParser.call(this, strSource);
}
ExpressionParser.prototype = Object.create(BaseParser.prototype);

ExpressionParser.prototype.Tokens = {
    START : 0,
    END : 1,
    NOT : 2,
    AND : 3,
    OR  : 4,
    XOR : 5,
    CONST : 6,
    VARIABLE : 7,
    OPEN_BRACKET : 8,
    CLOSE_BRACKET : 9
};
ExpressionParser.prototype.parse = function() {
    this.variablesList = [];
    this.currBracketBalance = 0;
    this.currentToken = this.Tokens.START;
    this.currVariable = null;
    this.nextChar();
    let res = {
        parsed : this.parseBinary(),
        variables : this.variablesList
    };
    return res;
}
ExpressionParser.prototype.parseBinary = function() {
    let left = this.parseUnary();
    while (true) {
        switch(this.currentToken) {
            case this.Tokens.AND :
                left = new BoolAnd(left, this.parseUnary());
                break;
            case this.Tokens.Or :
                left = new BoolOr(left, this.parseUnary());
                break;
            case this.Tokens.XOR :
                left = new BoolXor(left, this.parseUnary());
                break;
            default:
                return left;
        }
    }
}
ExpressionParser.prototype.parseUnary = function() {
    let curr = null;
    this.next();
    switch(this.currentToken) {
        case this.Tokens.NOT :
            curr = new BoolNot(this.parseUnary());
            break;
        case this.Tokens.OPEN_BRACKET :
            curr = this.parseBinary();
            this.next();
            break;
        case this.Tokens.VARIABLE :
            
            curr = new Variable(this.currVariable);
            this.next();
            break;
        case this.Tokens.CONST :
            curr = new Constant(this.currentConst);
            this.next();
            break;
        }
    return curr;
}
ExpressionParser.prototype.lastTokenisOperand = function() {
    let cToken = this.currentToken;
    return  (cToken === this.Tokens.CLOSE_BRACKET
        ||   cToken === this.Tokens.VARIABLE
        ||   cToken === this.Tokens.CONST
    );
}
ExpressionParser.prototype.next = function() {
  
    this.skipWhiteSpaces();
    console.log(this.ch)
    if (this.test('\0')) {
        if (!this.lastTokenisOperand())
            throw new Error("Unexpected ending");
        this.currentToken = this.Tokens.END;
        return ;
    }
    switch(this.ch) {
        case "&" :
            if (!this.lastTokenisOperand())
                throw new Error("Invalid '&' use, expected operand");
            this.currentToken = this.Tokens.AND;
            break;
        case "|" :
            if (!this.lastTokenisOperand())
                throw new Error("Invalid '|' use, expected operand");
            this.currentToken = this.Tokens.OR;
            break;
        case "!" :
            this.currentToken = this.Tokens.NOT;
            break;
        case "(" :
            if (this.lastTokenisOperand())
                throw new Error("Expected operator, found '(");
            this.currentToken = this.Tokens.OPEN_BRACKET;
            break;
        case ")" :
            if (currentToken === this.Tokens.OPEN_BRACKET) {
                throw new Error ("Using of empty brackets is not allowed");
            }
            if (!this.lastTokenisOperand) {
                throw new Error("Unexpected closing of brackets, expected operand");
            }
            this.currBracketBalance--;
            if (this.currBracketBalance < 0) {
                throw new Error("Brackets missmatch, ");
            }
            this.currentToken = this.Tokens.CLOSE_BRACKET;
            break;

        default :
            if (this.isVariable()) {
                if (this.lastTokenisOperand()) {
                    throw new Error("Didn't expect variable");
                }
                if (!this.variablesList.includes(this.ch))
                    this.variablesList.push(this.ch);
                this.currVariable = this.ch;
                this.currentToken = this.Tokens.VARIABLE;   
                            
            }
            else if (this.between("0", "1")) {
                if (this.lastTokenisOperand()) {
                    throw new Error("Didn't expect Const");
                }
                this.currentConst = parseInt(this.ch);
                this.currentToken = this.Tokens.CONST;
            }
            else {
                throw new Error("unrecognized char : " + this.ch);
            }
    }
    this.nextChar();
}
let e = new ExpressionParser(new StringSource("a & b"))
e.parse();  
