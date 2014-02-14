
// no need to use disconnect. on error should always call for more work but pass (error first,last) 

module.exports = repipe;

function repipe(s,makeSource){
  // the last value from the source stream
  function work(last){
    var source = makeSource(last); 
    resumeable(last,source,s);
    source.on('disconnect',function(last){
      work(last);
    })
  }

  work();
}


// its kinda like pipe except everythig bubbles.
function resumeable(last,source,s){
  source.on('data',function(data){
    last = data;
    s.write(data);
  })

  source.on('error',function(e){ 
    console.log('ignore error 1') 
    if(e && e.code == "E_MDM") {
      source.emit('disconnect',last,e);
      source.disconnected = true;
      source.end();
    } else {
      s.emit('error',e);
    }
  })

  var onPause = function(){
    source.pause();
  };

  var onDrain = function(){
    source.resume();
  };

  var onEnd = function(){
    source.end();
  };

  s.on('pause',onPause);
  s.on('drain',onDrain);
  s.on('end',onEnd);

  source.on('end',function(){
    s.removeListener('pause',onPause);
    s.removeListener('drain',onDrain);
    s.removeListener('end',onEnd);
    if(!source.disconnected) s.end();// done for real.
  })
  return s;
}


