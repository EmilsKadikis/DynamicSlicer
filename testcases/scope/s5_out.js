function sliceMe() {
    return addGlobalA(2);
}
function addGlobalA(x) {
    return x + a;
}
var a = 3;
var result = sliceMe();
var message;
if (result == 4) {
} else {
    message = 'result is not 4';
}
console.log(message);