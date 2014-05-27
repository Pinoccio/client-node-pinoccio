var api = require('./')

var a = api({api:'http://localhost:8002',token:'71933a35bd8fa564be3096bcdb815061'});

var c = 0

while(c<10) command();

function command(){
  ++c
  a.rest({url:'/v1/2/2/command/led.yellow'},function(err,data){
    console.log(c,'err',err,'data',data);
    --c;
    if(!c) console.log('done');
  })
}
