(function (jalangi) {
    function ExampleAnalysis() {
        log = {
            "writes": [],
            "declares": [],       
            "reads": [],
            "conditionals": [],
        };

        function getFullLocation(iid) {
            return jalangi.iidToLocation(jalangi.getGlobalIID(iid));
        }
    
        function getLineNumber(iid) {
            let fullLocation = getFullLocation(iid);
            return fullLocation.split(":")[2];
        }

        this.write = function(iid, name, val, lhs) {
            log.writes.push({iid: iid, name: name, val: val, lhs: lhs, location: getLineNumber(iid)});
        }

        this.declare = function(iid, name, val, isArgumentSync) {
            log.declares.push({iid: iid, name: name, val: val, lhs: isArgumentSync, location: getLineNumber(iid)});
        }

        this.conditional = function(iid, result) {
            log.conditionals.push({iid: iid, result: result, location: getLineNumber(iid)});
        };

        this.read = function(iid, name, val, isGlobal) {
            log.reads.push({iid: iid, name: name, val: val, isGlobal: isGlobal, location: getLineNumber(iid)});
        }

        this.endExecution = function() {
            console.log("<END EXECUTION>");
            console.log(JSON.stringify(log));
        }
    }

    jalangi.analysis = new ExampleAnalysis();
}(J$));