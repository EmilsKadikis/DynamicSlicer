(function (sandbox) {
    require('./codeLocations.js');

    var codeLocations = new sandbox.CodeLocations();
    sandbox.codeLocations = codeLocations;

    function ExecutionHistoryAnalysis() {

        sandbox.executionHistory = [];

        function addToExecutionHistory(iid) {
            let location = codeLocations.location(iid);
            let lastLocation = sandbox.executionHistory[sandbox.executionHistory.length - 1];
            if (!lastLocation || lastLocation !== location)
                sandbox.executionHistory.push(location);
        }


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
        }

        this._break = function (iid) {
            addToExecutionHistory(iid);
        }

        this._continue = function (iid) {
            addToExecutionHistory(iid);
        }
    
        this.write = function(iid, name, val, lhs) {
            addToExecutionHistory(iid);
        }
    
        this.declare = function(iid, name, val, isArgumentSync) {
            //addToExecutionHistory(iid);
        }
    
        this.conditional = function(iid, result) {
            addToExecutionHistory(iid);
        };
    
        this.read = function(iid, name, val, isGlobal) {
            addToExecutionHistory(iid);
        }
    
        this.invokeFunPre = function(iid, f, base, args, isConstructor, isMethod, functionIid) {
            addToExecutionHistory(iid);
        }
        
        this._return = function(iid, val) {
            addToExecutionHistory(iid);
        }
    
        this.invokeFun = function(iid, f, base, args, result, isConstructor, isMethod, functionIid) {
            addToExecutionHistory(iid);
        }
    
        this.endExpression = function(iid) {
            addToExecutionHistory(iid);
        }
    
        this.putFieldPre = function(iid, base, offset, val, isComputed, isOpAssign) {
            addToExecutionHistory(iid);
        }
    
        this.getFieldPre = function(iid, base, offset, isComputed, isOpAssign, isMethodCall) {
            addToExecutionHistory(iid);
        }
    }

    sandbox.analysis = new ExecutionHistoryAnalysis();
})(J$);




