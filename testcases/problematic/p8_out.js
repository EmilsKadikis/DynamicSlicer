function sliceMe() {
    var result = factorial(10);
    return result;
}
function factorial(n) {
    if (n <= 1) {
        return 1;
    } else {
        return n * factorial(n - 1);
    }
}
sliceMe();