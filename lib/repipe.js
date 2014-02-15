
// todo decouple from our mdm implmentation and publish as own module.
// no need to use disconnect. on error should always call for more work but pass (error first,last) 

module.exports = repipe;

function repipe(s,makeSource){
  // the last value from the source stream
  function work(last){
    makeSource(last,function(err,source){
      if(err) {
        return s.emit('error',err);
      }
      // not returning a source is how you stop the repipe.
      if(!source) {
        var e = new Error('repipe. no source stream');
        e.code = "E_REPIPE";
        return s.emit('error',e);
      }
   
      resumeable(last,source,s);
      source.on('disconnect',function(last){
        work(last);
      });

    });
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


