

module.exports = function(bitlashStream){
  var id = 0;
  bitlashStream.on('data',function(o){
    if(!o.cb) return;
    o.cb(false,o.result);
    o.cb = false;
  });

  return function(command,cb){
    var o = {command:command,cb:cb};
    bitlashStream.write(o);
    setTimeout(function(){
      if(o.cb) o.cb(new Error('bitlash: command '+o.command+' did not respond in 10 seconds'));
      o.cb = false;
    },10000).unref();
  }

}

