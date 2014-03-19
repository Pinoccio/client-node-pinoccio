

module.exports = function(bitlashStream){
  bitlashStream.on('data',function(o){
    if(!o.cb) return;
    o.cb(false,o.result.replace(o.command,"").trim());
    o.cb = false;
  });

  return function(command,cb){
    var o = {type:'command',command:command,cb:cb};
    bitlashStream.write(o);
    setTimeout(function(){
      if(o.cb) o.cb(new Error('bitlash: command '+o.command+' did not respond in 10 seconds'));
      o.cb = false;
    },10000).unref();
  }

}

