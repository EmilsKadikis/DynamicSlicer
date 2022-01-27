function WhichBranchesAreHitAnalysis(jalangi) {
    this.branches = [];	
    this.branchDirection = {};

    this.conditional = function (iid, result) {
        if (!this.branches.includes(iid)) {
            this.branches.push(iid);   
            this.branchDirection[iid] = result;
        }
    };

    this.analysisResult = function() {
        return { branches: this.branches, branchDirections: this.branchDirection };
    }
}

module.exports = { WhichBranchesAreHitAnalysis };