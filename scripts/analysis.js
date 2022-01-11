(function (jalangi) {
    function ExampleAnalysis() {
        log = {
            "writes": [],
            "declares": [],       
            "reads": [],
            "conditionals": [],
        };
        execution_order = [];
        declares = {};
        usages = {};

        call_stack = [];

        function addUsage(iid, name) {
            let loc = getLineNumber(iid);

            if (!usages[loc])
                usages[loc] = new Set();
            if (name)
                usages[loc].add(name);

            for (let i = 0; i < call_stack.length; i++)
                usages[loc].add(call_stack[i]);
        }

        function addDeclaration(iid, name) {
            let loc = getLineNumber(iid);

            if (!declares[loc])
                declares[loc] = new Set();
            declares[loc].add(name);
        }

        function addToExecutionHistory(iid) {
            let loc = getLineNumber(iid);
            let last_location = execution_order[execution_order.length - 1];
            if (!last_location || last_location !== loc)
                execution_order.push(loc);
        }

        function getFullLocation(iid) {
            return jalangi.iidToLocation(jalangi.getGlobalIID(iid));
        }
    
        function getLineNumber(iid) {
            let fullLocation = getFullLocation(iid);
            return fullLocation.split(":")[2];
        }

        this.write = function(iid, name, val, lhs) {
            addToExecutionHistory(iid);
            addDeclaration(iid, name);
        }

        this.declare = function(iid, name, val, isArgumentSync) {
            addToExecutionHistory(iid);
            addDeclaration(iid, name);
        }

        this.conditional = function(iid, result) {
            log.conditionals.push({iid: iid, result: result, location: getLineNumber(iid)});
        };

        this.read = function(iid, name, val, isGlobal) {
            addToExecutionHistory(iid);
            addUsage(iid, name);
        }

        this.invokeFunPre = function(iid, f, base, args, isConstructor, isMethod, functionIid) {
            addToExecutionHistory(iid);
            addDeclaration(iid, f.name + "_" + iid);
            call_stack.push(f.name + "_" + iid);
            addUsage(iid, f.name);
        }
        
        this._return = function(iid, val) {
            addToExecutionHistory(iid);
            addDeclaration(iid, call_stack[call_stack.length - 1] + "_return_value");
        }

        this.invokeFun = function(iid, f, base, args, result, isConstructor, isMethod, functionIid) {
            addToExecutionHistory(iid);
            call_stack.pop();
            addUsage(iid, f.name + "_" + iid + "_return_value");
        }

        this.endExpression = function(iid) {
            addToExecutionHistory(iid);
            addUsage(iid)
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
                        slices[i] = new Set(DynDep[declared_variable]);
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
            
            // convert sets in slices to arrays
            for (let i in slices)
                slices[i] = Array.from(slices[i]).map(Number);

            console.log(JSON.stringify(slices));
        }
    }

    jalangi.analysis = new ExampleAnalysis();
}(J$));