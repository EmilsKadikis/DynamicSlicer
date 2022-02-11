/*
 * An analysis that tracks the current scope.
 * A new scope is created, for example, when entering a function call.
 */

(function (sandbox) {
    function Scope() {

        // Global scope here means whatever is declared in the top level of the script.
        this.GLOBAL = "*global*";
        var callStack = [this.GLOBAL]; 


        this.current = function () {
            return callStack[callStack.length - 1];
        }

        this.parent = function () {
            if (callStack.length > 1)
                return callStack[callStack.length - 2];
            else
                throw "Global scope has no parent";
        }

        this.enter = function(iid, name) {
            // If the same function is called multiple times, it should create different scopes, so I also add the iid.
            callStack.push("*" + name + "|" + iid + "*");
        }

        this.exit = function() {
            callStack.pop();

            if (callStack.length == 0)
                throw "Can't exit global scope";
        }
    }

    function ScopeAnalysis() {

        // Make the scope tracker available to the other analyses.
        var scope = new Scope();
        sandbox.scope = scope;

        var codeLocations = new sandbox.CodeLocations();

        /////////////////////////////CALLBACKS////////////////////////////////////


        // Called right before the function is exectuted.
        this.invokeFunPre = function(iid, f, base, args, isConstructor, isMethod, functionIid) {
            if (isMethod) { // Methods are defined with anonymous function literals, so they don't have a name. 
                let location = codeLocations.location(functionIid);
                // To be able to prune/keep the scoped variable declarations in the AST, 
                // we need to keep the line on which the function is defined, since that's available in the AST.
                scope.enter(iid, "ANONYMOUS_FUNC@" + location)
            }
            else
                scope.enter(iid, f.name);
        };

        // Called right after the function has finished exectuting.
        this.invokeFun = function(iid, f, base, args, result, isConstructor, isMethod, functionIid) {
            scope.exit();
        };
    }

    sandbox.analysis = new ScopeAnalysis();
})(J$);




