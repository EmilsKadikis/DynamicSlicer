/*
 * A simple analysis that tracks which lines are exectuted and in what order.
 */


(function (sandbox) {
    require('./codeLocations.js');

    var codeLocations = new sandbox.CodeLocations();

    function ExecutionHistoryAnalysis() {

        // This makes the execution history available to all other analyses.
        sandbox.executionHistory = [];

        // Add a new entry to the execution history.
        function addToExecutionHistory(iid) {
            let location = codeLocations.location(iid);
            let lastLocation = sandbox.executionHistory[sandbox.executionHistory.length - 1];
            // Only add the location if it is different from the last line.
            // This is done because the same line will trigger multiple callbacks, but only one entry is needed.
            if (!lastLocation || lastLocation !== location)
                sandbox.executionHistory.push(location);
        }

        /////////////////////////////CALLBACKS////////////////////////////////////

        this.literal = function (iid, val, hasGetterSetter) {
            addToExecutionHistory(iid);
        };
    
        this.write = function(iid, name, val, lhs) {
            addToExecutionHistory(iid);
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




