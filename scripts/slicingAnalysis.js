(function (jalangi) {
    function SlicingAnalysis(branching) {
        execution_order = [];
        declares = {};
        usages = {};
    
        function_declaration_lines = new Set();
        conditional_iids = {};
    
        call_stack = [];

        breaks_and_continues = [];
    
        function getObjectIdentifier(v) {
            var type = typeof v;
            if ((type === 'object' || type ==='function') && v!== null) {
                var shadowObj = jalangi.smemory.getShadowObjectOfObject(v);
                return jalangi.smemory.getIDFromShadowObjectOrFrame(shadowObj);
            } else {
                return null;
            }
        }
    
        function addUsage(iid, name, val) {
            let loc = getLineNumber(iid);
    
            if (!usages[loc])
                usages[loc] = new Set();
    
            let shadowObjIdentifier = getObjectIdentifier(val);
            if(shadowObjIdentifier) {
                usages[loc].add(shadowObjIdentifier);
            }
            if(name) {
                usages[loc].add(name);
            }     
          
            for (let i = 0; i < call_stack.length; i++)
                usages[loc].add(call_stack[i]);
        }
    
        function addDeclaration(iid, name, val) {
            let loc = getLineNumber(iid);
    
            if (!declares[loc])
                declares[loc] = new Set();
            
            let shadowObjIdentifier = getObjectIdentifier(val);
            if(shadowObjIdentifier) {
                declares[loc].add(shadowObjIdentifier);
            }
    
            if (name) {
                declares[loc].add(name);
            }      
        }
    
        function addToExecutionHistory(iid) {
            let loc = getLineNumber(iid);
            let last_location = execution_order[execution_order.length - 1];
            if (!last_location || last_location !== loc)
                execution_order.push(loc);
    
            if (loc in branching) {
                let conditionals = branching[loc];
                conditionals.forEach(conditionalLine => {
                    let conditionalIid = conditional_iids[conditionalLine];
                    addUsage(iid, conditionalIid+"conditional", null);
                })
            }

            for (let i = 0; i < breaks_and_continues.length; i++) {
                if(!usages[loc])
                    usages[loc] = new Set();
                usages[loc].add(breaks_and_continues[i]);
            }
        }
    
        function getFullLocation(iid) {
            return jalangi.iidToLocation(jalangi.getGlobalIID(iid));
        }
    
        function getLineNumber(iid) {
            let fullLocation = getFullLocation(iid);
            return fullLocation.split(":")[2];
        }

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
            addToExecutionHistory(iid);
            addDeclaration(iid, null, val)
        }

        this._break = function (iid) {
            addToExecutionHistory(iid);
            addDeclaration(iid, iid + "break", null);
            breaks_and_continues.push(iid + "break");
        }

        this._continue = function (iid) {
            addToExecutionHistory(iid);
            addDeclaration(iid, iid + "continue", null);
            breaks_and_continues.push(iid + "continue");
        }
    
        this.write = function(iid, name, val, lhs) {
            addToExecutionHistory(iid);
            addDeclaration(iid, name, null);
        }
    
        this.declare = function(iid, name, val, isArgumentSync) {
            addToExecutionHistory(iid);
            addDeclaration(iid, name, val);
    
            if (typeof val === 'function') {
                function_declaration_lines.add(getLineNumber(iid));
            }
        }
    
        this.conditional = function(iid, result) {
            let line = getLineNumber(iid);
            conditional_iids[line] = iid;
            addDeclaration(iid, iid + "conditional", null);
        };
    
        this.read = function(iid, name, val, isGlobal) {
            addToExecutionHistory(iid);
            addUsage(iid, name, null);
        }
    
        this.invokeFunPre = function(iid, f, base, args, isConstructor, isMethod, functionIid) {
            addToExecutionHistory(iid);
            addDeclaration(iid, null, base);
            addUsage(iid, null, f);
    
            let shadowObjIdentifier = getObjectIdentifier(base);
            if(shadowObjIdentifier) {
                call_stack.push(shadowObjIdentifier);
            }
        }
        
        this._return = function(iid, val) {
            addToExecutionHistory(iid);
            addUsage(iid, null, val);
            addDeclaration(iid, call_stack[call_stack.length - 1] + "_return_value", val);
        }
    
        this.invokeFun = function(iid, f, base, args, result, isConstructor, isMethod, functionIid) {
            addToExecutionHistory(iid);
            call_stack.pop();
            let shadowObjIdentifier = getObjectIdentifier(base);
            addUsage(iid, shadowObjIdentifier + "_return_value", result);
        }
    
        this.endExpression = function(iid) {
            addToExecutionHistory(iid);
            addUsage(iid)
        }
    
        this.putFieldPre = function(iid, base, offset, val, isComputed, isOpAssign) {
            addToExecutionHistory(iid);
            let shadowObjIdentifier = getObjectIdentifier(base);
            addDeclaration(iid, shadowObjIdentifier+'.'+offset, null);
            addDeclaration(iid, null, base);
        }
    
        this.getFieldPre = function(iid, base, offset, isComputed, isOpAssign, isMethodCall) {
            addToExecutionHistory(iid);
            let shadowObjIdentifier = getObjectIdentifier(base);
            addUsage(iid, shadowObjIdentifier+'.'+offset, null);
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
    
        this.endExecution = function() {
            console.log("<END EXECUTION>");
    
            let DynDep = {};
            let LS = {}
    
            let slices = {}
            let used_variables = {}
    
            // Slicing algorithm from https://dl.acm.org/doi/pdf/10.1145/318774.319248
            execution_order.forEach(i => {
                if(declares[i]) {
                    Array.from(declares[i]).forEach(declared_variable => {
                        if (!DynDep[declared_variable])
                            DynDep[declared_variable] = new Set();
                        if (usages[i]) {
                            usages[i].forEach(u => {
                                DynDep[declared_variable] = union(DynDep[declared_variable], DynDep[u]);
                                if(LS[u]) {
                                    DynDep[declared_variable].add(LS[u]); 
                                }                
                            });
                        }
                        if (i in declares) {
                            LS[declared_variable] = i;
                        }
                        if (i in slices) {
                            slices[i] = union(slices[i], new Set(DynDep[declared_variable]));
                        } else {
                            slices[i] = new Set(DynDep[declared_variable]);
                        }
                        slices[i].add(i);
                    });
                    
                }
                else {
                    slices[i] = new Set();
                    if (usages[i]) {
                        usages[i].forEach(u => {
                            slices[i] = union(slices[i], DynDep[u]);
                            if(LS[u]) {
                                slices[i].add(LS[u]);
                            }                 
                        });
                    }
                    slices[i].add(i);
                }
            });
    
    
            function calculateUsedVariables(lines) {
                if (lines === undefined)
                    return new Set();
                let variables = new Set();
                
                lines.forEach(line => {
                    if(usages[line] !== undefined) {
                        usages[line].forEach(variable => {
                            variables.add(variable);
                        });
                    }
                    if(!function_declaration_lines.has(line) && declares[line] !== undefined) {
                        declares[line].forEach(variable => {
                            variables.add(variable);
                        });
                    }
                });
    
                return Array.from(variables);
            }
    
            for (let i in slices)
                used_variables[i] = calculateUsedVariables(slices[i]);
    
            // convert sets in slices to arrays
            for (let i in slices)
                slices[i] = Array.from(slices[i]).map(Number);
    
            console.log(JSON.stringify({ slices, used_variables }));
        }
    }
    let fileName = jalangi.initParams['branch_coverage_file'];
    let fs = require('fs');
    let branchingAnalysis = JSON.parse(fs.readFileSync(fileName, 'utf8'));
    jalangi.analysis = new SlicingAnalysis(branchingAnalysis);
}(J$));