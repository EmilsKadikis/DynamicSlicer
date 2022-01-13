//
// An analysis that runs each of the analyses passed in args one after the other, passing along the results of each analysis to the next.
//
function SerializedAnalyses(jalangi, ...args) {
    this.jalangi = jalangi;
    this.analyses = args.reverse();
    let FirstAnalysis = this.analyses.pop();
    this.currentAnalysis = new FirstAnalysis(jalangi);

    this.scriptExit = function (iid, wrappedExceptionVal) {
        if (this.currentAnalysis.scriptExit) {
            let result = this.currentAnalysis.scriptExit(iid, wrappedExceptionVal);
            if (result.isBacktrack)
                return result;    
        }
        if (this.analyses.length > 0) {
            let NextAnalysis = this.analyses.pop();           
            if (this.currentAnalysis.analysisResult)
                this.currentAnalysis = new NextAnalysis(this.jalangi, this.currentAnalysis.analysisResult());
            else 
                this.currentAnalysis = new NextAnalysis(this.jalangi);
            return {wrappedExceptionVal: wrappedExceptionVal, isBacktrack: true};
        }
        else 
            return {wrappedExceptionVal: wrappedExceptionVal, isBacktrack: false};
    };

    this.invokeFunPre = function (iid, f, base, args, isConstructor, isMethod, functionIid, functionSid) {
        if (this.currentAnalysis.invokeFunPre)
            return this.currentAnalysis.invokeFunPre(iid, f, base, args, isConstructor, isMethod, functionIid, functionSid);
    };

    this.invokeFun = function (iid, f, base, args, result, isConstructor, isMethod, functionIid, functionSid) {
        if (this.currentAnalysis.invokeFun)
            return this.currentAnalysis.invokeFun(iid, f, base, args, result, isConstructor, isMethod, functionIid, functionSid);
    };

    this.literal = function (iid, val, hasGetterSetter) {
        if (this.currentAnalysis.literal)
            return this.currentAnalysis.literal(iid, val, hasGetterSetter);
    };
  
    this.forinObject = function (iid, val) {
        if (this.currentAnalysis.forinObject)
            return this.currentAnalysis.forinObject(iid, val);
    };

    this.declare = function (iid, name, val, isArgument, argumentIndex, isCatchParam) {
        if (this.currentAnalysis.declare)
            return this.currentAnalysis.declare(iid, name, val, isArgument, argumentIndex, isCatchParam);
    };

    this.getFieldPre = function (iid, base, offset, isComputed, isOpAssign, isMethodCall) {
        if (this.currentAnalysis.getFieldPre)
            return this.currentAnalysis.getFieldPre(iid, base, offset, isComputed, isOpAssign, isMethodCall);
    };

    this.getField = function (iid, base, offset, val, isComputed, isOpAssign, isMethodCall) {
        if (this.currentAnalysis.getField)
            return this.currentAnalysis.getField(iid, base, offset, val, isComputed, isOpAssign, isMethodCall);
    };

    this.putFieldPre = function (iid, base, offset, val, isComputed, isOpAssign) {
        if (this.currentAnalysis.putFieldPre)
            return this.currentAnalysis.putFieldPre(iid, base, offset, val, isComputed, isOpAssign);
    };

    this.putField = function (iid, base, offset, val, isComputed, isOpAssign) {
        if (this.currentAnalysis.putField)
            return this.currentAnalysis.putField(iid, base, offset, val, isComputed, isOpAssign);
    };

    this.read = function (iid, name, val, isGlobal, isScriptLocal) {
        if (this.currentAnalysis.read)
            return this.currentAnalysis.read(iid, name, val, isGlobal, isScriptLocal);
    };

    this.write = function (iid, name, val, lhs, isGlobal, isScriptLocal) {
        if (this.currentAnalysis.write)
            return this.currentAnalysis.write(iid, name, val, lhs, isGlobal, isScriptLocal);
    };

    this._return = function (iid, val) {
        if (this.currentAnalysis._return)
            return this.currentAnalysis._return(iid, val);
    };

    this._throw = function (iid, val) {
        if (this.currentAnalysis._throw)
            return this.currentAnalysis._throw(iid, val);
    };

    this._with = function (iid, val) {
        if (this.currentAnalysis._with)
            return this.currentAnalysis._with(iid, val);
    };

    this.functionEnter = function (iid, f, dis, args) {
        if (this.currentAnalysis.functionEnter)
            this.currentAnalysis.functionEnter(iid, f, dis, args);
    };

    this.functionExit = function (iid, returnVal, wrappedExceptionVal) {
        if (this.currentAnalysis.functionExit)
            return this.currentAnalysis.functionExit(iid, returnVal, wrappedExceptionVal);
    };

    this.scriptEnter = function (iid, instrumentedFileName, originalFileName) {
        if (this.currentAnalysis.scriptEnter)
            this.currentAnalysis.scriptEnter(iid, instrumentedFileName, originalFileName);
    };

    this.binaryPre = function (iid, op, left, right, isOpAssign, isSwitchCaseComparison, isComputed) {
        if (this.currentAnalysis.binaryPre)
            return this.currentAnalysis.binaryPre(iid, op, left, right, isOpAssign, isSwitchCaseComparison, isComputed);
    };

    this.binary = function (iid, op, left, right, result, isOpAssign, isSwitchCaseComparison, isComputed) {
        if (this.currentAnalysis.binary)
            return this.currentAnalysis.binary(iid, op, left, right, result, isOpAssign, isSwitchCaseComparison, isComputed);
    };

    this.unaryPre = function (iid, op, left) {
        if (this.currentAnalysis.unaryPre)
            return this.currentAnalysis.unaryPre(iid, op, left);
    };

    this.unary = function (iid, op, left, result) {
        if (this.currentAnalysis.unary)
            return this.currentAnalysis.unary(iid, op, left, result);
    };

    this.conditional = function (iid, result) {
        if (this.currentAnalysis.conditional)
            return this.currentAnalysis.conditional(iid, result);
    };

    this.instrumentCodePre = function (iid, code, isDirect) {
        if (this.currentAnalysis.instrumentCodePre)
            return this.currentAnalysis.instrumentCodePre(iid, code, isDirect);
    };

    this.instrumentCode = function (iid, newCode, newAst, isDirect) {
        if (this.currentAnalysis.instrumentCode)
            return this.currentAnalysis.instrumentCode(iid, newCode, newAst, isDirect);
    };

    this.endExpression = function (iid) {
        if (this.currentAnalysis.endExpression)
            this.currentAnalysis.endExpression(iid);
    };

    this.endExecution = function () {
        if (this.currentAnalysis.endExecution)
            this.currentAnalysis.endExecution();
    };
}

module.exports = { SerializedAnalyses };