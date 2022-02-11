function sliceMe() {
    var result = factorial(1);
    return result; //slicing criteria
}
function factorial(n) {
    if (n <= 1) {
        return 1;
    } else {
        return n * factorial(n - 1);
    }
}
sliceMe();