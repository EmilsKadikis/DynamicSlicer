function sliceMe() {
    var a = 2;
    return addGlobalA(2); 
}

function addGlobalA(x) {
    return x + a;
}

var a = 3;

var result = sliceMe();
var message;
if(result == 5) {
    message = "result is 5";
} else {
    message = "result is not 5";
}
console.log(message); //slicing criteria