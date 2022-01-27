function DynamicBranchAnalysis(jalangi, interestingBranches) {
    let branchesTakenOnThisRun = new Set();
    let branchCoverage = {};
    let alternativeBranchesTried = new Set();
    let branchesTried = new Set();

    function add(iid) {
        if (!branchCoverage[iid])
            branchCoverage[iid] = new Set();

        branchCoverage[iid] = union(branchCoverage[iid], branchesTakenOnThisRun)
    }

    function union(setA, setB) {        
        let _union = new Set(setA)
        if(setB) {
            for (let elem of setB) {
                _union.add(elem)
            }
        }
        return _union
    }

    function getFullLocation(iid) {
        return jalangi.iidToLocation(jalangi.getGlobalIID(iid));
    }

    function getLineNumber(iid) {
        let fullLocation = getFullLocation(iid);
        return fullLocation.split(":")[2];
    }

    this.conditional = function (iid, result) {
        let branchDirection = result;
        if (interestingBranches.branches.includes(iid)) {
            if (!alternativeBranchesTried.has(iid)) {
                alternativeBranchesTried.add(iid);
                branchDirection = !result;
                branchesTakenOnThisRun.add(iid + 'a');
            } else if (!branchesTried.has(iid)) {
                branchesTried.add(iid);
                branchesTakenOnThisRun.add(iid + 'b');
            }
        }

        return {result: branchDirection};
    };

    this.scriptExit = function (iid, wrappedExceptionVal) {
        branchesTakenOnThisRun = new Set();

        let areAllBranchesTried = interestingBranches.branches.length == branchesTried.size;
        return {wrappedExceptionVal: wrappedExceptionVal, isBacktrack: !areAllBranchesTried};
    };




    
    this.invokeFunPre = function (iid, f, base, args, isConstructor, isMethod, functionIid, functionSid) {
        add(iid);
    };

    this.invokeFun = function (iid, f, base, args, result, isConstructor, isMethod, functionIid, functionSid) {
        add(iid);
    };

    this.literal = function (iid, val, hasGetterSetter) {
        add(iid);
    };
  
    this.forinObject = function (iid, val) {
        add(iid);
    };

    this.declare = function (iid, name, val, isArgument, argumentIndex, isCatchParam) {
        add(iid);
    };

    this.getFieldPre = function (iid, base, offset, isComputed, isOpAssign, isMethodCall) {
        add(iid);
    };

    this.getField = function (iid, base, offset, val, isComputed, isOpAssign, isMethodCall) {
        add(iid);
    };

    this.putFieldPre = function (iid, base, offset, val, isComputed, isOpAssign) {
        add(iid);
    };

    this.putField = function (iid, base, offset, val, isComputed, isOpAssign) {
        add(iid);
    };

    this.read = function (iid, name, val, isGlobal, isScriptLocal) {
        add(iid);
    };

    this.write = function (iid, name, val, lhs, isGlobal, isScriptLocal) {
        add(iid);
    };

    this._return = function (iid, val) {
        add(iid);
    };

    this._throw = function (iid, val) {
        add(iid);
    };

    this._with = function (iid, val) {
        add(iid);
    };

    this.functionEnter = function (iid, f, dis, args) {
        add(iid);
    };

    this.functionExit = function (iid, returnVal, wrappedExceptionVal) {
        add(iid);
    };

    this.scriptEnter = function (iid, instrumentedFileName, originalFileName) {
        //add(iid);
    };

    this.binaryPre = function (iid, op, left, right, isOpAssign, isSwitchCaseComparison, isComputed) {
        add(iid);
    };

    this.binary = function (iid, op, left, right, result, isOpAssign, isSwitchCaseComparison, isComputed) {
        add(iid);
    };

    this.unaryPre = function (iid, op, left) {
        add(iid);
    };

    this.unary = function (iid, op, left, result) {
        add(iid);
    };

    this.instrumentCodePre = function (iid, code, isDirect) {
        //add(iid);
    };

    this.instrumentCode = function (iid, newCode, newAst, isDirect) {
        add(iid);
    };

    this.endExpression = function (iid) {
        add(iid);
    };



    this.analysisResult = function() {
        let result = branchCoverage;
        let branchCoverageForLines = {};

        for (let iid in result) {
            let lineNumber = getLineNumber(iid);
            if (!branchCoverageForLines[lineNumber])
                branchCoverageForLines[lineNumber] = new Set();

            branchCoverageForLines[lineNumber] = union(branchCoverageForLines[lineNumber], result[iid])
        }

        for (let line in branchCoverageForLines) {
            let branchCoverageAtLine = Array.from(branchCoverageForLines[line]);
            let newSet = new Set();
            for (let i in branchCoverageAtLine) {
                let branch = branchCoverageAtLine[i];
                let branchIid = branch.substring(0, branch.length - 1);
                if (newSet.has(branchIid))
                    newSet.delete(branchIid);
                else
                    newSet.add(branchIid);
            }

            branchCoverageForLines[line] = newSet;
        }

        return branchCoverageForLines;
    }
}

module.exports = { DynamicBranchAnalysis: DynamicBranchAnalysis };