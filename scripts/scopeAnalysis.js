(function (sandbox) {
    function Scope() {
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
            callStack.push("*" + name + "|" + iid + "*");
        }

        this.exit = function() {
            callStack.pop();

            if (callStack.length == 0) {
                throw "Can't exit global scope";
            }
        }
    }

    function ScopeAnalysis() {

        var scope = new Scope();
        sandbox.scope = scope;

        
        this.invokeFunPre = function(iid, f, base, args, isConstructor, isMethod, functionIid) {
            scope.enter(iid, f.name);
        };


        this.invokeFun = function(iid, f, base, args, result, isConstructor, isMethod, functionIid) {
            scope.exit();
        };
    }

    sandbox.analysis = new ScopeAnalysis();
})(J$);




