if (typeof J$ === 'undefined') {
    J$ = {};
}

(function (sandbox) {
    require('./codeLocations.js');

    var codeLocations = new sandbox.CodeLocations();
    sandbox.codeLocations = codeLocations;

    Set.prototype.union = function(otherSet) {
        var union = new Set(this);
        if (otherSet) {
            otherSet.forEach(function(item) {
                union.add(item);
            });
        }
        return union;
    };

    sandbox.DynamicSlicer = function (branching) {
        var variableUsages = {};
        var objectUsages = {};
        var variableDeclarations = {};
        var objectDeclarations = {};

        var breakAndContinueDummyVariables = [];

        function combineDictionaries(dict1, dict2){
            var newDict = {};
            for (var i in dict1) {
                newDict[i] = dict1[i];
            }
            for (var j in dict2) {
                if (newDict[j])
                    newDict[j] = newDict[j].union(dict2[j]);
                else
                    newDict[j] = dict2[j];
            }
            return newDict;
        };

        function getObjectIdentifier(v) {
            var type = typeof v;
            if ((type === 'object' || type ==='function') && v!== null) {
                var shadowObj = sandbox.smemory.getShadowObjectOfObject(v);
                return "&" + type + sandbox.smemory.getIDFromShadowObjectOrFrame(shadowObj);
            } else {
                return null;
            }
        };

        function addScopeToShadowObject(value, scope) {
            var shadowObj = sandbox.smemory.getShadowObjectOfObject(value);
            shadowObj["*J*SCOPE"] = scope;
        }

        function getScopeFromShadowObject(value) {
            var shadowObj = sandbox.smemory.getShadowObjectOfObject(value);
            if (shadowObj["*J*SCOPE"])
                return shadowObj["*J*SCOPE"] ;
            else
                return sandbox.scope.GLOBAL;
        }

        function variableDeclarationSet(iid) {
            let location = codeLocations.location(iid);
            if(!variableDeclarations[location])
                variableDeclarations[location] = new Set();
            return variableDeclarations[location];
        }

        function variableUsageSet(iid) {
            let location = codeLocations.location(iid);
            if(!variableUsages[location])
                variableUsages[location] = new Set();
            return variableUsages[location];
        }

        function objectDeclarationSet(iid) {
            let location = codeLocations.location(iid);
            if(!objectDeclarations[location])
                objectDeclarations[location] = new Set();
            return objectDeclarations[location];
        }

        function objectUsageSet(iid) {
            let location = codeLocations.location(iid);
            if(!objectUsages[location])
                objectUsages[location] = new Set();
            return objectUsages[location];
        }

        this.variableDeclared = function(iid, name) {
            let scope = sandbox.scope.current();
            variableDeclarationSet(iid).add(scope + name);
        };

        this.variableUsed = function (iid, name, isGlobal = false) {
            let scope = isGlobal ? sandbox.scope.GLOBAL : sandbox.scope.current();
            variableUsageSet(iid).add(scope + name);
        };

        this.objectDeclared = function (iid, value) {
            let scope = sandbox.scope.current();
            addScopeToShadowObject(value, scope);
            objectDeclarationSet(iid).add(scope + getObjectIdentifier(value));
        };

        this.functionDeclared = function (iid, f) {
            this.objectDeclared(iid, f);
            this.variableDeclared(iid, f.name);
        }

        this.objectUsed = function(iid, value) {
            let scope = getScopeFromShadowObject(value);
            objectUsageSet(iid).add(scope + getObjectIdentifier(value));
        };

        this.objectPropertyUsed = function(iid, base, offset) {
            if (typeof base === 'string')
                return; // Ignore string properties, such as "abcd".length

            let scope = getScopeFromShadowObject(base);
            objectUsageSet(iid).add(scope + getObjectIdentifier(base) + '.' + offset);
        };

        this.objectPropertyDeclared = function(iid, base, offset) {
            let scope = getScopeFromShadowObject(base);
            let objId = getObjectIdentifier(base);
            objectDeclarationSet(iid).add(scope + objId);
            objectDeclarationSet(iid).add(scope + objId + '.' + offset);
        };

        this.functionInvoked = function(iid, f) {
            this.objectUsed(iid, f);
            this.variableUsed(iid, f.name);

            let scope = sandbox.scope.current();
            objectDeclarationSet(iid).add(scope);
        };

        this.returningFromFunction = function(iid, val) {
            if(typeof val === "object" || typeof val === "function")
                this.objectUsed(iid, val);

            this.lastReturnVariable = sandbox.scope.current() + "&RETURN";
            variableDeclarationSet(iid).add(this.lastReturnVariable);
        };
    

        this.returnedFromFunction = function(iid, base, result) {
            if(!this.lastReturnVariable) // if this is undefined, then returningFromFunction was not called
                return;                  // this means it was a global function, and we don't care about it

            variableUsageSet(iid).add(this.lastReturnVariable);
            this.lastReturnVariable = undefined;
        };

        this.endExpression = function(iid) {
            let location = codeLocations.location(iid);
            let scope = sandbox.scope.current();
            objectUsageSet(iid).add(scope);

            addDependencyOnConditionals(location);
            addDependencyOnBreaksAndContinues(location);
        };

        function addDependencyOnConditionals(location) {
            if (location in branching) {
                if(!variableUsages[location])
                    variableUsages[location] = new Set();

                let conditionals = branching[location];
                conditionals.forEach(conditionalLine => {
                    let scope = sandbox.scope.current();
                    variableUsages[location].add(scope + "&conditional" + conditionalLine);
                })
            }
        };

        function addDependencyOnBreaksAndContinues(location) {
            breakAndContinueDummyVariables.forEach(breakOrContinueDummyVariable => {
                if(!variableUsages[location])
                    variableUsages[location] = new Set();
                variableUsages[location].add(breakOrContinueDummyVariable);
            });
        };

        this.conditionalHit = function(iid) {
            let location = codeLocations.location(iid);
            let scope = sandbox.scope.current();
            variableDeclarationSet(iid).add(scope + "&conditional" + location);
        };

        this.breakHit = function(iid) {
            let location = codeLocations.location(iid);
            let scope = sandbox.scope.current();
            let dummyVariableName = scope + "&break" + location;
            variableDeclarationSet(iid).add(dummyVariableName);
            breakAndContinueDummyVariables.push(dummyVariableName);
        };

        this.continueHit = function(iid) {
            let location = codeLocations.location(iid);
            let scope = sandbox.scope.current();
            let dummyVariableName = scope + "&continue" + location;
            variableDeclarationSet(iid).add(dummyVariableName);
            breakAndContinueDummyVariables.push(dummyVariableName);
        };

        this.calculateSlices = function () {
            let DynDep = {};
            let LD = {}
    
            let slices = {}

            let allUsages = combineDictionaries(objectUsages, variableUsages);
            let allDeclarations = combineDictionaries(objectDeclarations, variableDeclarations);
    
            // Slicing algorithm from https://dl.acm.org/doi/pdf/10.1145/318774.319248
            sandbox.executionHistory.forEach(i => {
                if(allDeclarations[i]) {
                    Array.from(allDeclarations[i]).forEach(declared_variable => {
                        if (!DynDep[declared_variable])
                            DynDep[declared_variable] = new Set();
                        if (allUsages[i]) {
                            allUsages[i].forEach(u => {
                                DynDep[declared_variable] = DynDep[declared_variable].union(DynDep[u]);
                                if(LD[u]) {
                                    DynDep[declared_variable].add(LD[u]); 
                                }                
                            });
                        }
                        if (i in allDeclarations) {
                            LD[declared_variable] = i;
                        }
                        if (i in slices) {
                            slices[i] = slices[i].union(new Set(DynDep[declared_variable]));
                        } else {
                            slices[i] = new Set(DynDep[declared_variable]);
                        }
                        slices[i].add(i);
                    });
                    
                }
                /*else {
                    slices[i] = new Set();
                    if (usages[i]) {
                        usages[i].forEach(u => {
                            slices[i] = slices[i].union(DynDep[u]);
                            if(LD[u]) {
                                slices[i].add(LD[u]);
                            }                 
                        });
                    }
                    slices[i].add(i);
                }*/
            });
   
            // convert sets in slices to arrays
            for (let i in slices)
                slices[i] = Array.from(slices[i]).map(Number);
    
            return slices;
        };

        this.calculateUsedVariables = function (slices) {
            let usedVariables = {}

            function _calculateUsedVariables(lines) {
                if (lines === undefined)
                    return {};
                let variables = {};

                lines.forEach(line => {
                    if(variableUsages[line] !== undefined) {
                        variableUsages[line].forEach(_handleVariable);
                    }
                    if(/*!function_declaration_lines.has(line) &&*/ variableDeclarations[line] !== undefined) {
                        variableDeclarations[line].forEach(_handleVariable);
                    }
                });

                function _handleVariable(variable) {
                    let splitVariable = variable.split("*");
                    let scope = splitVariable[1];
                    let scopeName = scope.split("|")[0];
                    let name = splitVariable[2];
                    if (name.includes("&"))
                        return; // This is a dummy variable, the AST parser doesn't care about these
                    if (!variables[scopeName])
                        variables[scopeName] = new Set();
                    variables[scopeName].add(name);
                }

                for (let v in variables)
                    variables[v] = Array.from(variables[v]);

                return variables;
            }
    
            for (let i in slices)
                usedVariables[i] = _calculateUsedVariables(slices[i]);

            return usedVariables;
        };
    };

}(J$));