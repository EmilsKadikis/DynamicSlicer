function sliceMe() {
    var x = 0;
    while (true){
        x++;
        if (x > 5) { // this whole break statement is removed 
            break;
        }
    }    
    return x;
}

sliceMe();
//criteria: line 9