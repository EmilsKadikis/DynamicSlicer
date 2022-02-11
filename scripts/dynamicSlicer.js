/*
 * Script that keeps track of declarations/usages and actually does the slice calculations.
 */

if (typeof J$ === 'undefined') {
    J$ = {};
}

Set.prototype.union = function(otherSet) {
    var union = new Set(this);
    if (otherSet) {
        otherSet.forEach(function(item) {
            union.add(item);
        });
    }
    return union;
};

(function (sandbox) {
    // Helper to convert iids to code locations in a unified way.
    require('./codeLocations.js');
    var codeLocations = new sandbox.CodeLocations();

    sandbox.DynamicSlicer = function (branching) {
        // Main data structures for tracking usages and declarations for each line of code.
        // Contains both actual variables, as well as dummy variables created for conditionals, scopes, etc.
        // These will be in the format of *{SCOPE NAME}*{VARIABLE NAME}     for actual variables
        //                            and *{SCOPE NAME}*&{TYPE OF VARIABLE} for dummy variables.
        var usages = {};
        var declarations = {};

        // If a break/continue has been hit, a dummy variable is declared, and all the following lines are considered to use it.
        // This list tracks which dummy variables have been declared already.
        var breakAndContinueDummyVariables = [];

        // Convenience function that gets the appropriate set where variable declarations should be put.
        function declarationSet(iid) {
            let location = codeLocations.location(iid);
            if(!declarations[location])
                declarations[location] = new Set();
            return declarations[location];
        }

        // Convenience function that gets the appropriate set where variable usages should be put.
        function usageSet(iid) {
            let location = codeLocations.location(iid);
            if(!usages[location])
                usages[location] = new Set();
            return usages[location];
        }

        /////////////////////// SHADOW MEMORY HELPERS /////////////////////////////

        // Returns a unique id for the object instance contained in v
        function getObjectIdentifier(v) {
            var type = typeof v;
            if ((type === 'object' || type ==='function') && v!== null) {
                var shadowObj = sandbox.smemory.getShadowObjectOfObject(v);
                return "&" + type + sandbox.smemory.getIDFromShadowObjectOrFrame(shadowObj);
            } else {
                return null;
            }
        };

        // Associates an object instance with the name of the scope in which it was declared.
        function addScopeToShadowObject(value, scope) {
            var shadowObj = sandbox.smemory.getShadowObjectOfObject(value);
            shadowObj["*J*SCOPE"] = scope;
        }

        // Returns the scope where the object instance was declared.
        function getScopeFromShadowObject(value) {
            var shadowObj = sandbox.smemory.getShadowObjectOfObject(value);
            if (shadowObj["*J*SCOPE"])
                return shadowObj["*J*SCOPE"] ;
            else
                return sandbox.scope.GLOBAL;
        }

        /////////////////////// DECLARATIONS /////////////////////////////

        // A variable, aka a "bucket" that could contain a value is declared. 
        this.variableDeclared = function(iid, name) {
            let scope = sandbox.scope.current();
            declarationSet(iid).add(scope + name);
        };
        
        // An object instance is declared. Doesn't matter in which "bucket" it's contained.
        this.objectDeclared = function (iid, value) {
            let scope = sandbox.scope.current();
            addScopeToShadowObject(value, scope);
            declarationSet(iid).add(scope + getObjectIdentifier(value));
        };

        // Function declarations create both a function object and a variable for its name.
        this.functionDeclared = function (iid, f) {
            this.objectDeclared(iid, f);
            this.variableDeclared(iid, f.name);
        }

        // When a property on an object instance is written to, both the whole object is 
        // considered to be redeclared and the specific property on it. 
        // This helps with cases where only a specific property is used, so the slice can ignore other properties.
        this.objectPropertyDeclared = function(iid, base, offset) {
            let scope = getScopeFromShadowObject(base);
            let objId = getObjectIdentifier(base);
            declarationSet(iid).add(scope + objId);
            declarationSet(iid).add(scope + objId + '.' + offset);
        };

        /////////////////////// USAGES /////////////////////////////

        // A variable, aka the "bucket" that can contain anything is used.
        this.variableUsed = function (iid, name, isGlobal = false) {
            let scope = isGlobal ? sandbox.scope.GLOBAL : sandbox.scope.current();
            usageSet(iid).add(scope + name);
        };

        // The whole object is used, so we care about all the places where ANY properties on it were declared.
        this.objectUsed = function(iid, value) {
            let scope = getScopeFromShadowObject(value);
            usageSet(iid).add(scope + getObjectIdentifier(value));
        };

        // Only a specific property on an object is used, so we don't necessarily care about the whole object.
        this.objectPropertyUsed = function(iid, base, offset) {
            if (typeof base === 'string')
                return; // Ignore string properties, such as "abcd".length

            let scope = getScopeFromShadowObject(base);
            usageSet(iid).add(scope + getObjectIdentifier(base) + '.' + offset);
        };

        /////////////////////// FUNCTION CALLS /////////////////////////////

        // Called when a function is invoked. 
        // At this point, the scopeAnalysis has already recorded a new scope for this function, so we can just use sandbox.scope.current()
        this.functionInvoked = function(iid, f) {
            // Add a usage for the actual function object.
            this.objectUsed(iid, f);

            // Add a usage for the variable that contains the function object.
            this.variableUsed(iid, f.name);

            // Declare a new scope. All lines within the function will "use" this scope.
            let scope = sandbox.scope.current();
            declarationSet(iid).add(scope);
        };

        // Called right when return is called.
        this.returningFromFunction = function(iid, val) {
            // If the function is returning an object instance, we're using it.
            // We don't care about primitives since we don't track them. 
            if(typeof val === "object" || typeof val === "function")
                this.objectUsed(iid, val);

            // Declare a dummy variable that signifies the return value.
            this.lastReturnVariable = sandbox.scope.current() + "&return";
            declarationSet(iid).add(this.lastReturnVariable);
        };
    
        // Called after the control flow has returned to the spot where the function was called.
        this.returnedFromFunction = function(iid, base, result) {
            if(!this.lastReturnVariable) // if this is undefined, then returningFromFunction was not called
                return;                  // this means it was a global function, and we don't care about it

            // Add a usage for the dummy return variable that we defined in returningFromFunction.
            usageSet(iid).add(this.lastReturnVariable);
            this.lastReturnVariable = undefined;
        };

        /////////////////////// CONDITIONALS /////////////////////////////

        // This is called even if a line does not declare/use any variables. 
        this.endExpression = function(iid) {
            let location = codeLocations.location(iid);
            let scope = sandbox.scope.current();

            // All lines "use" the scope that they are within. 
            // This is needed so that function declaration/call is kept if the slicing criterion is within the function.
            usageSet(iid).add(scope);

            // Add usages for the appropriate conditional/break/continue dummy variables.
            addDependencyOnConditionals(location);
            addDependencyOnBreaksAndContinues(location);
        };

        // If current code location falls under a conditional, we need to add its dummy variable to the usage set.
        function addDependencyOnConditionals(location) {
            if (location in branching) {
                if(!usages[location])
                    usages[location] = new Set();

                let conditionals = branching[location];
                conditionals.forEach(conditionalLine => {
                    let scope = sandbox.scope.current();
                    usages[location].add(scope + "&conditional" + conditionalLine);
                })
            }
        };

        // If ANY break/continues have been hit, the line depends on it.
        function addDependencyOnBreaksAndContinues(location) {
            breakAndContinueDummyVariables.forEach(breakOrContinueDummyVariable => {
                if(!usages[location])
                    usages[location] = new Set();
                usages[location].add(breakOrContinueDummyVariable);
            });
        };

        this.conditionalHit = function(iid) {
            let location = codeLocations.location(iid);
            let scope = sandbox.scope.current();
            declarationSet(iid).add(scope + "&conditional" + location);
        };

        this.breakHit = function(iid) {
            let location = codeLocations.location(iid);
            let scope = sandbox.scope.current();
            let dummyVariableName = scope + "&break" + location;
            declarationSet(iid).add(dummyVariableName);
            breakAndContinueDummyVariables.push(dummyVariableName);
        };

        this.continueHit = function(iid) {
            let location = codeLocations.location(iid);
            let scope = sandbox.scope.current();
            let dummyVariableName = scope + "&continue" + location;
            declarationSet(iid).add(dummyVariableName);
            breakAndContinueDummyVariables.push(dummyVariableName);
        };

        /////////////////////// SLICE CACLULATION FUNCTIONS /////////////////////////////

        // Slicing algorithm from https://dl.acm.org/doi/pdf/10.1145/318774.319248
        this.calculateSlices = function () {
            // Dynamic dependency sets for each variable
            let DynDep = {};
            // Location where each variable was Last Declared (LD)
            let LD = {}
    
            let slices = {}

            // Iterate through all executed lines
            sandbox.executionHistory.forEach(i => {
                if(declarations[i]) {
                    // Iterate through all variables that were declared on this line
                    Array.from(declarations[i]).forEach(declaredVariable => {
                        if (!DynDep[declaredVariable])
                            DynDep[declaredVariable] = new Set();

                        if (usages[i]) {
                            // Iterate through all the variables that were used on this line
                            usages[i].forEach(u => {
                                // The declared variable dedpends on all the lines that the used variable depends on
                                DynDep[declaredVariable] = DynDep[declaredVariable].union(DynDep[u]);

                                // The declared variable depends on the lines where all of the used variables were last changed
                                if(LD[u]) {
                                    DynDep[declaredVariable].add(LD[u]); 
                                }                
                            });
                        }

                        // Update the last declaration of the variable
                        LD[declaredVariable] = i;

                        // Save the slice for the current line.
                        // If a line is executed multiple times, the slice for the last execution will be kept.
                        if (!slices[i]) 
                            slices[i] = new Set();

                        slices[i] = slices[i].union(new Set(DynDep[declaredVariable]));

                        // The slice at line i must also contain line i itself.
                        slices[i].add(i);
                    });                  
                }                
            });
   
            // convert sets in slices to arrays
            for (let i in slices)
                slices[i] = Array.from(slices[i]).map(Number);
    
            return slices;
        };

        // Calculate what variables are required for each slice
        this.calculateUsedVariables = function (slices) {

            // Helper function that calculates used variables for a single slice containing the specified lines
            function _calculateUsedVariables(lines) {
                if (lines === undefined)
                    return {};
                let variables = {};

                // A slice uses all the variables that are used/declared on any of the lines in the slice
                lines.forEach(line => {
                    if(usages[line] !== undefined) {
                        usages[line].forEach(_handleVariable);
                    }
                    if(declarations[line] !== undefined) {
                        declarations[line].forEach(_handleVariable);
                    }
                });

                // Helper function that handles a single variable
                //
                // The variable will be formatted like:
                // *{scope_name}|{iid}*{variable_name}    for actual variables
                // *{scope_name}|{iid}*&{variable_identifier}  for dummy variables
                function _handleVariable(variable) {
                    let splitVariable = variable.split("*");
                    let scope = splitVariable[1];
                    let scopeName = scope.split("|")[0]; // The AST parser doesn't care about the iid, just the name of the function
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
    
            let usedVariables = {}

            for (let i in slices)
                usedVariables[i] = _calculateUsedVariables(slices[i]);

            return usedVariables;
        };
    };

}(J$));