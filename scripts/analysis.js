(function (jalangi) {
    const SerializedAnalyses = require("./serializedAnalyses.js").SerializedAnalyses;

    const DynamicBranchAnalysis = require("./dynamicBranchAnalysis.js").DynamicBranchAnalysis;
    const SlicingAnalysis = require("./slicingAnalysis.js").SlicingAnalysis;
    const WhichBranchesAreHitAnalysis = require("./whichBranchesAreHitAnalysis.js").WhichBranchesAreHitAnalysis;

    jalangi.analysis = new SerializedAnalyses(jalangi, WhichBranchesAreHitAnalysis, DynamicBranchAnalysis, SlicingAnalysis);
}(J$));