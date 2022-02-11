/*
 * The main slicing analysis script.
 * 
 * Calculates a dynamic global backwards slice of the program.
 * 
 * The main slicing functionality is implemented in dynamicSlicer.js.
 * This file mainly maps the appropriate Jalangi callbacks to the corresponding functions on the actual slicer.
 * 
 * Requires a branching analysis to be run first, so it knows which lines of code fall under which conditional statements.
 * The result of it should be stored into a file, the name of which needs to be passed as a command line parameter
 * when running the analysis: 
 * 
 *     --initParam branch_coverage_file:fileName
 * 
 * Also requires SMemory (provided by Jalangi), executionHistoryAnalysis and scopeAnalysis (both provided by me) to be run together with this one.
 * 
 */

(function (sandbox) {
    // Load the actual slicer.
    require('./dynamicSlicer.js');

    // Load the results of the branching analysis.
    let fs = require('fs');
    let fileName = sandbox.initParams['branch_coverage_file'];
    let branchingAnalysis = JSON.parse(fs.readFileSync(fileName, 'utf8'));

    function SlicingAnalysis(branching) {  
        var slicer = new sandbox.DynamicSlicer(branching);

        // This is called BEFORE the code is instrumented by Jalangi.
        // This allows us to do edit the code a bit so that break/continue 
        // statements are also instrumented.
        this.instrumentCodePre = function (iid, code, isDirect) {
            // Add a string literal on the same line as any break/continue statements.
            // Because of this, the break/continue lines will at least trigger the literal callback.
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

        /////////////////////// CONDITIONALS /////////////////////////////
        
        this.conditional = function(iid, result) {
            slicer.conditionalHit(iid);
        };

        this._break = function (iid) {
            slicer.breakHit(iid);
        }

        this._continue = function (iid) {
            slicer.continueHit(iid);
        }

        /////////////////////// VARIABLE DECLARATIONS/USAGES /////////////////////////////

        // A variable is re-declared whenever some value is written to it.
        // We can't properly deal with declarations in the form "var a;", since the declare callback 
        // for all variables is called at the start of the scope, not where the variable is actually declared.
        //
        // Initial variable declarations are handled when actually pruning the AST.
        this.write = function(iid, name, val, lhs) {
            slicer.variableDeclared(iid, name);
        } 
    
        this.read = function(iid, name, val, isGlobal, isScriptLocal) {
            slicer.variableUsed(iid, name, isGlobal || isScriptLocal);
        }
    
        /////////////////////// OBJECT INSTANCE DECLARATIONS/USAGES /////////////////////////////

        this._literal = function(iid, val, hasGetterSetter) {
            // We only care about object and function literals, since primitives don't have instances that need to be tracked.
            if (typeof val === "object") {
                slicer.objectDeclared(iid, val);
            } else if (typeof val === "function") {
                slicer.functionDeclared(iid, val);
            }
        }

        this.putFieldPre = function(iid, base, offset, val, isComputed, isOpAssign) {
            slicer.objectPropertyDeclared(iid, base, offset);
        }
    
        this.getFieldPre = function(iid, base, offset, isComputed, isOpAssign, isMethodCall) {
            slicer.objectPropertyUsed(iid, base, offset);
        }

        this.endExpression = function(iid) {
            slicer.endExpression(iid);
        }
        
        /////////////////////// FUNCTION CALLS /////////////////////////////

        this.invokeFunPre = function(iid, f, base, args, isConstructor, isMethod, functionIid) {
            slicer.functionInvoked(iid, f);
        }        
        
        this._return = function(iid, val) {
            slicer.returningFromFunction(iid, val);
        }
    
        this.invokeFun = function(iid, f, base, args, result, isConstructor, isMethod, functionIid) {
            slicer.returnedFromFunction(iid, base, result);
        }

        /////////////////////// FINAL PROCESSING /////////////////////////////

        this.endExecution = function() {
            // The result is return using the standard output.
            // Since the program being sliced might write something to it, we write a boundary marker.
            console.log("<END EXECUTION>");
    
            slices = slicer.calculateSlices();
            used_variables = slicer.calculateUsedVariables(slices);
            
            console.log(JSON.stringify({ slices, used_variables }));
        }
    }

    sandbox.analysis = new SlicingAnalysis(branchingAnalysis);
}(J$));