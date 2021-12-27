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

    function run_analysis(inFile) {
        inputArgs = " --inlineIID --inlineSource --analysis ../../jalangi2-master/src/js/sample_analyses/ChainedAnalyses.js --analysis ../../jalangi2-master/src/js/runtime/SMemory.js --analysis analysis.js " + inFile;
		stmt = 'node ../../jalangi2-master/src/js/commands/jalangi.js ' + inputArgs;
        
		var cp = require('child_process');
		
        var analysisResult = cp.execSync(stmt,
            function (error, stdout, stderr) {
                if (error !== null) {
                    console.log('exec error: ' + error);		    	
                    console.log('stderr: ' + stderr);
                }
		    }).toString();

        var lines = analysisResult.split("<END EXECUTION>");

        return JSON.parse(lines[lines.length - 1]);
    }
        

    function keep_lines(programText, linesToKeep) {
        let acorn = require("acorn");
        let ast = acorn.parse(programText, {locations:true})
        //console.log(ast);

        let escodegen = require("escodegen");
        newProgramText = escodegen.generate(ast);

        return newProgramText
    }

    function slice(inFile, outFile, lineNb){
        console.log("running slice.js for arguments: "+ inFile, outFile, lineNb);

        let fs = require('fs');
        let programText = fs.readFileSync(inFile, 'utf8');
        
        analysis_result = run_analysis(inFile);
        console.log(analysis_result);
        
        newProgramText = keep_lines(programText, [1,2,3,4])

        fs.writeFileSync(outFile, newProgramText);     
    }

    slice(args.inFile, args.outFile, args.lineNb);

})();
// Run the analysis with:
// node src/js/commands/jalangi.js --inlineIID --inlineSource --analysis exampleAnalysis.js program.js
