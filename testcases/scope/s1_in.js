function sliceMe() {
    var obj2 = obj;
    obj2.parameter = true;
}

var obj = {}
obj.test = function(a) {
    if (obj.parameter)
        return a;
    else 
        return -a;
}

sliceMe();
var result = obj.test(); //slicing criteria