function StaticBranchAnalysis(code) {
    let acorn = require("acorn");
    let estraverse = require("estraverse");
    let ast = acorn.parse(code, {locations:true})

    let branchLocations = {};

    estraverse.traverse(ast, {
        enter: function (node, parent) {
            if (node.type == 'IfStatement' || node.type == 'WhileStatement' || node.type == 'DoWhileStatement' || node.type == 'ForStatement') {
                branchLocations[node.loc.start.line] = { start: node.loc.start.line, end: node.loc.end.line};
            } 
        }
    });

    let branchCoverage = {};
    for (let line in branchLocations) {
        let branch = branchLocations[line];
        for (let i = branch.start + 1; i <= branch.end; i++) {
            if (!branchCoverage[i])
                branchCoverage[i] = new Set();
            branchCoverage[i].add(line);
        }
    }

    for (let i in branchCoverage)
        branchCoverage[i] = Array.from(branchCoverage[i]).map(Number);

    return branchCoverage;
}

module.exports = { StaticBranchAnalysis: StaticBranchAnalysis };