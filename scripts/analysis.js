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

        function addUsage(loc, name) {
            if (!usages[loc]) {
                usages[loc] = new Set();
            }
            usages[loc].add(name);
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
            log.writes.push({iid: iid, name: name, val: val, lhs: lhs, location: getLineNumber(iid)});

            let loc = getLineNumber(iid);
            addToExecutionHistory(iid);

            declares[loc] = name;
        }

        this.declare = function(iid, name, val, isArgumentSync) {
            log.declares.push({iid: iid, name: name, val: val, lhs: isArgumentSync, location: getLineNumber(iid)});
            
            let loc = getLineNumber(iid);
            addToExecutionHistory(iid);

            declares[loc] = name;
        }

        this.conditional = function(iid, result) {
            log.conditionals.push({iid: iid, result: result, location: getLineNumber(iid)});
        };

        this.read = function(iid, name, val, isGlobal) {
            log.reads.push({iid: iid, name: name, val: val, isGlobal: isGlobal, location: getLineNumber(iid)});
            let loc = getLineNumber(iid);
            addToExecutionHistory(iid);

            addUsage(loc, name);
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
                    if (!DynDep[declares[i]])
                        DynDep[declares[i]] = new Set();
                    if (usages[i]) {
                        usages[i].forEach(u => {
                            DynDep[declares[i]] = union(DynDep[declares[i]], DynDep[u]);
                            if(LS[u]) {
                                DynDep[declares[i]].add(LS[u]); 
                            }                
                        });
                    }
                    if (i in declares) {
                        LS[declares[i]] = i;
                    }
                    slices[i] = new Set(DynDep[declares[i]]);
                    slices[i].add(i);
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
                slices[i] = Array.from(slices[i]);

            console.log(JSON.stringify(slices));
        }
    }

    jalangi.analysis = new ExampleAnalysis();
}(J$));