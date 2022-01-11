(function (jalangi) {
    const SerializedAnalyses = require("./serializedAnalyses.js").SerializedAnalyses;

    const BranchAnalysis = require("./branchAnalysis.js").BranchAnalysis;
    const SlicingAnalysis = require("./slicingAnalysis.js").SlicingAnalysis;

    jalangi.analysis = new SerializedAnalyses(jalangi, BranchAnalysis, SlicingAnalysis);
}(J$));