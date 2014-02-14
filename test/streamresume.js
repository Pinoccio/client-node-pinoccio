
var through = require('through');
var repipe = require('../lib/repipe')

var lastread = false;
var s = through(function(data){
  lastread = data;
  console.log('last item: ',lastread);
  this.queue(data);
});

var lastout = false;;
var sout = through(function(data){
  lastout = data;
  console.log('out>',data)
});

s.pipe(sout);

repipe(s,function(startFromHere){
  return makeNumbersStream(startFromHere) 
});



function makeNumbersStream(start){
  var source = through();

  var i = start||0,t;
  t = setInterval(function(){
    ++i;
    source.write(i);
    console.log('write',i);

    if(i === 97){

      source.end();// im done.

    } else if(i%5 === 0){
      var e = new Error('unexpected disconnection');
      e.code = "E_MDM";
      source.emit('error',e);
      clearInterval(t);
    } 

  },1);

  source.on('end',function(){
    clearInterval(t);
  });

  return source;
}

