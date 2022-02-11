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

    // Function that performs the slicing analysis.
    function runAnalysis(inFile, branchCoverage) {
        // Save branch coverage result to a json file.
        const fs = require("fs");
        const path = require('path');
        let fileName = path.parse(inFile).name + "_" + new Date().getTime() + "_branchCoverage.json";
        fs.writeFileSync(fileName, JSON.stringify(branchCoverage));


        let relativeJalangiLocation = "../../jalangi2-master/src/js/"; //TODO: Make this configurable.

        // Pass it to jalangi for the slicing analysis.
		let branchCoverageArgs = " --initParam branch_coverage_file:" + fileName;
        let inputArgs = " --inlineIID --inlineSource";
        let analysisArgs =  " --analysis " + relativeJalangiLocation + "sample_analyses/ChainedAnalyses.js"; // Required for Jalangi to load multiple analyses.
        analysisArgs +=     " --analysis " + relativeJalangiLocation + "runtime/SMemory.js";                 // Required for shadow memory.
        analysisArgs +=     " --analysis executionHistoryAnalysis.js";  
        analysisArgs +=     " --analysis scopeAnalysis.js";
        analysisArgs +=     " --analysis analysis.js " + inFile
        let stmt = "node " + relativeJalangiLocation + "commands/jalangi.js " + branchCoverageArgs + inputArgs + analysisArgs;
        
        // Execute stmt in a separate Jalangi process.
		var cp = require('child_process');
		
        var analysisResult = cp.execSync(stmt,
            function (error, stdout, stderr) {
                if (error !== null) {
                    console.log('exec error: ' + error);		    	
                    console.log('stderr: ' + stderr);
                }
		    }).toString();

        // Get the result from the stdout of the process.
        // The analysis outputs a separator line followed by the result.
        var lines = analysisResult.split("<END EXECUTION>");

        fs.unlinkSync(fileName)
        return JSON.parse(lines[lines.length - 1]);
    }
        
    // Function that prunes code that is not contained in the calculated slice.
    function keepLines(programText, linesToKeep, usedVariables) {
        let acorn = require("acorn");
        let estraverse = require("estraverse");
        let ast = acorn.parse(programText, {locations:true})

        // Helper function to check if a node's location contains one of the lines that need to be kept.
        function isAtLeastOneLineInLocation(lines, loc) {
            for (let i in lines) {
                let line = lines[i];
                if (loc.start.line <= line && line <= loc.end.line)
                    return true;
            }
            return false;
        }

        // We need to keep a track of the scope we are on while traversing so that we know which variables are in scope.
        let callStack = ["global"];
        let newAst = estraverse.replace(ast, {
            enter: function (node, parent) {
                if (node.type == 'FunctionDeclaration')
                    callStack.push(node.id.name);
                if (node.type == 'FunctionExpression')
                    callStack.push("ANONYMOUS_FUNC@"+node.loc.start.line);

                if (node.type === "BreakStatement" || node.type === "ContinueStatement")
                    return; // Always keep break and continue statements. This will only be hit within blocks that are being kept anyway.

                // Keep all VariableDeclaration nodes that declare a variable that was used in the slice.
                // This ensures that all "var x;" statements are kept in the locations where they appeared in the original
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
            leave: function (node) {
                if (node.type == 'FunctionDeclaration' || node.type == 'FunctionExpression')
                    callStack.pop();

                // Fix if statements whose consequent was deleted by adding an empty block.
                if (node.type === "IfStatement" && node.consequent === null) {
                    node.consequent = {
                        type: "BlockStatement",
                        body: []
                    }
                }
            }
        });

        // Re-generate the code from the pruned AST.
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

        analysisResult = runAnalysis(inFile, branchCoverage);

        if (!analysisResult.slices[lineNb] || !analysisResult.used_variables[lineNb]) {
            console.log("Line " + lineNb + " not found in the analysis result");
        } else {
            linesToKeep = analysisResult.slices[lineNb];
            usedVariables = analysisResult.used_variables[lineNb];
            
            newProgramText = keepLines(programText, linesToKeep, usedVariables)

            fs.writeFileSync(outFile, newProgramText);     
        }
    }

    slice(args.inFile, args.outFile, args.lineNb);

})();