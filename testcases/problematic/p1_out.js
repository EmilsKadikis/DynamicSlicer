function sliceMe() {
    var y = 0;
    for (var x = 0; x < 10; x++){
        if (x < 2) {
            y += x;
        } else {
            break;  
        }        
    }    
    if (y>4) {
    }
}

sliceMe();
