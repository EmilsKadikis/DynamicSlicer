(function (sandbox) {
    require('./dynamicSlicer.js');

    function SlicingAnalysis(branching) {  

        var slicer = new sandbox.DynamicSlicer();
        sandbox.dynamicSlicer = slicer;

        this.instrumentCodePre = function (iid, code, isDirect) {
            // replace any occurance of break/continue statements in code
            // to add a string literal. This is a hack to create new jalangi callbacks
            // for break/continue statements.
            code = code.replace(/break;/g, function (match) {
                return "'jalangi: break called'; break;";
            });
            code = code.replace(/continue;/g, function (match) {
                return "'jalangi: continue called'; continue;";
            });

            return {code: code, skip: false};
        };

        // this callback is hijacked to provide a new callback for break/continue statements
        this.literal = function (iid, val, hasGetterSetter) {
            if (val == "jalangi: break called") {
                this._break(iid);
            } else if (val == "jalangi: continue called") {
                this._continue(iid);
            } else {
                this._literal(iid, val, hasGetterSetter);
            }
        };

        this._literal = function(iid, val, hasGetterSetter) {
            if (typeof val === "object") {
                slicer.objectDeclared(iid, val);
            } else if (typeof val === "function") {
                slicer.functionDeclared(iid, val);
            }
        }

        this._break = function (iid) {

        }

        this._continue = function (iid) {

        }
    
        this.write = function(iid, name, val, lhs) {
            slicer.variableDeclared(iid, name);
        }
    
        this.declare = function(iid, name, val, isArgumentSync) {

        }
    
        this.conditional = function(iid, result) {

        };
    
        this.read = function(iid, name, val, isGlobal) {
            slicer.variableUsed(iid, name);
            //if (typeof val === "object" || typeof val === "function") {
            //    slicer.objectUsed(iid, val);
            //}
        }
    
        this.invokeFunPre = function(iid, f, base, args, isConstructor, isMethod, functionIid) {
            slicer.functionInvoked(iid, f);
        }

        this.functionEnter = function(iid, f, dis, args) {           

        }
        
        
        this._return = function(iid, val) {
            slicer.returningFromFunction(iid, val);
        }
    
        this.invokeFun = function(iid, f, base, args, result, isConstructor, isMethod, functionIid) {
            slicer.returnedFromFunction(iid, base, result);
        }
    
        this.endExpression = function(iid) {
            slicer.endExpression(iid);
        }
    
        this.putFieldPre = function(iid, base, offset, val, isComputed, isOpAssign) {
            slicer.objectPropertyDeclared(iid, base, offset);
        }
    
        this.getFieldPre = function(iid, base, offset, isComputed, isOpAssign, isMethodCall) {
            slicer.objectPropertyUsed(iid, base, offset);
        }

    
        this.endExecution = function() {
            console.log("<END EXECUTION>");
    
            slices = slicer.calculateSlices();
            used_variables = slicer.calculateUsedVariables(slices);

            console.log(JSON.stringify({ slices, used_variables }));
        }
    }
    let fileName = sandbox.initParams['branch_coverage_file'];
    let fs = require('fs');
    let branchingAnalysis = JSON.parse(fs.readFileSync(fileName, 'utf8'));
    sandbox.analysis = new SlicingAnalysis(branchingAnalysis);
}(J$));