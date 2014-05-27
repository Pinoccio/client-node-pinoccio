

module.exports = function(bitlashStream){
  bitlashStream.on('data',function(o){
    if(!o.cb) return;
    var e = false;
    if(o.result.indexOf(o.command) === -1 ){
      // this command did not get written to serial successfully. 
      e = new Error('command was not recieved by bitlash correctly');
      e.code = "EWRITE";
    }
    o.cb(e,o.result.replace(o.command,"").trim());
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

