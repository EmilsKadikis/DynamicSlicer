/*
 * Helper function to convert iids to code locations in a unified way.
 * The locations are line numbers.
 */

if (typeof J$ === 'undefined') {
    J$ = {};
}

(function (sandbox) {
    sandbox.CodeLocations = function () {       
        this.fullLocation = function(iid) {
            return sandbox.iidToLocation(sandbox.getGlobalIID(iid));
        }

        this.location = function (iid) {
            let fullLocation = this.fullLocation(iid);
            return Number(fullLocation.split(":")[2]);
        };
    };

}(J$));