(function() {
    
    const { ArgumentParser } = require("argparse");
    const parser = new ArgumentParser({
        description: "Slices the given file using the specified criteria"
    });
    parser.add_argument(
        "--inFile", { help: "JavaScript file to be sliced", required: true });
    parser.add_argument(
        "--lineNb", { help: "Line number to be used as slicing criteria", required: true });
    parser.add_argument(
        "--outFile", { help: "Sliced and formated output file", required: true });

    const args = parser.parse_args();

    function run_analysis(inFile, branchCoverage) {
        // save branchCoverage to a json file
        const fs = require("fs");
        const path = require('path');
        let fileName = path.parse(inFile).name + "_" + new Date().getTime() + "_branchCoverage.json";
        fs.writeFileSync(fileName, JSON.stringify(branchCoverage));

        // pass it to jalangi for the slicing analysis
		branchCoverageArgs = " --initParam branch_coverage_file:" + fileName;
        inputArgs = " --inlineIID --inlineSource --analysis ../../jalangi2-master/src/js/sample_analyses/ChainedAnalyses.js --analysis ../../jalangi2-master/src/js/runtime/SMemory.js --analysis executionHistoryAnalysis.js --analysis scopeAnalysis.js --analysis analysis.js " + inFile;
        stmt = 'node ../../jalangi2-master/src/js/commands/jalangi.js ' + branchCoverageArgs + inputArgs;
        
		var cp = require('child_process');
		
        var analysisResult = cp.execSync(stmt,
            function (error, stdout, stderr) {
                if (error !== null) {
                    console.log('exec error: ' + error);		    	
                    console.log('stderr: ' + stderr);
                }
		    }).toString();

        var lines = analysisResult.split("<END EXECUTION>");

        fs.unlinkSync(fileName)
        return JSON.parse(lines[lines.length - 1]);
    }
        

    function keep_lines(programText, linesToKeep, usedVariables) {
        let acorn = require("acorn");
        let estraverse = require("estraverse");
        let ast = acorn.parse(programText, {locations:true})

        function isAtLeastOneLineInLocation(lines, loc) {
            for (let i in lines) {
                let line = lines[i];
                if (loc.start.line <= line && line <= loc.end.line)
                    return true;
            }
            return false;
        }

        let callStack = ["global"];
        let newAst = estraverse.replace(ast, {
            enter: function (node) {
                if (node.type == 'FunctionDeclaration')
                    callStack.push(node.id.name);
                if (node.type == 'FunctionExpression')
                    callStack.push("ANONYMOUS_FUNC@"+node.loc.start.line);

                if (node.type === "BreakStatement" || node.type === "ContinueStatement")
                    return; // Always keep break and continue statements. This will only be hit within blocks that are being kept anyway.

                if (node.type === "VariableDeclaration") {
                    let keep = false;
                    node.declarations.forEach(function (declaration) {
                        let scopedVariables = usedVariables[callStack[callStack.length - 1]];
                        if (scopedVariables && scopedVariables.includes(declaration.id.name)) {
                            keep = true;
                        }
                    });
                    if (keep) {
                        this.skip();
                        return;
                    }
                }

                if (node.loc && !isAtLeastOneLineInLocation(linesToKeep, node.loc)) {
                    this.remove();
                }
            },
            exit: function (node) {
                if (node.type == 'FunctionDeclaration' || node.type == 'FunctionExpression')
                    callStack.pop();
            }
        });

        let escodegen = require("escodegen");
        newProgramText = escodegen.generate(newAst);

        return newProgramText
    }

    function slice(inFile, outFile, lineNb){
        console.log("running slice.js for arguments: "+ inFile, outFile, lineNb);

        let fs = require('fs');
        let programText = fs.readFileSync(inFile, 'utf8');
        
        let StaticBranchAnalysis = require("./staticBranchAnalysis.js").StaticBranchAnalysis; 

        let branchCoverage = StaticBranchAnalysis(programText);

        analysisResult = run_analysis(inFile, branchCoverage);

        if (!analysisResult.slices[lineNb] || !analysisResult.used_variables[lineNb]) {
            console.log("Line " + lineNb + " not found in the analysis result");
        } else {
            linesToKeep = analysisResult.slices[lineNb];
            usedVariables = analysisResult.used_variables[lineNb];
            
            newProgramText = keep_lines(programText, linesToKeep, usedVariables)

            fs.writeFileSync(outFile, newProgramText);     
        }
    }

    slice(args.inFile, args.outFile, args.lineNb);

})();
// Run the analysis with:
// node src/js/commands/jalangi.js --inlineIID --inlineSource --analysis exampleAnalysis.js program.js
