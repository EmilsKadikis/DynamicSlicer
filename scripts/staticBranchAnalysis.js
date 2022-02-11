/*
 * A static branching analysis based on AST traversal.
 * Goes through the AST and remembers which locations fall under which conditional statements.
 */

function StaticBranchAnalysis(code) {
    let acorn = require("acorn");
    let estraverse = require("estraverse");

    // We need the {locations:true} so that the AST contains line numbers.
    let ast = acorn.parse(code, {locations:true})

    // First, get a dictionary that maps each branch locations to its start and end.
    let branchLocations = {};
    estraverse.traverse(ast, {
        enter: function (node, parent) {
            if (node.type == 'IfStatement' || node.type == 'WhileStatement' || node.type == 'DoWhileStatement' || node.type == 'ForStatement') {
                branchLocations[node.loc.start.line] = { start: node.loc.start.line, end: node.loc.end.line};
            } 
        }
    });

    // Second, convert this into a more convenient format:
    // mapping from line numbers to a list of conditional statements that that line falls under.
    let branchCoverage = {};
    // For each if, while, doWhile, for node:
    for (let line in branchLocations) {
        let branch = branchLocations[line];
        // Add all lines that full under that node to the branch coverage.
        for (let i = branch.start + 1; i <= branch.end; i++) {
            if (!branchCoverage[i])
                branchCoverage[i] = new Set();
            branchCoverage[i].add(line);
        }
    }

    // Sets have issues with being passed around as JSON, so we convert them to arrays.
    for (let i in branchCoverage)
        branchCoverage[i] = Array.from(branchCoverage[i]).map(Number);

    return branchCoverage;
}

module.exports = { StaticBranchAnalysis: StaticBranchAnalysis };