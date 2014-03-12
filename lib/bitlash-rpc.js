

module.exports = function(bitlashStream){
  bitlashStream.on('data',function(o){
    if(!o.cb) return;
    //console.log('---------------');
    //console.log('result> ',o.result);
    //console.log('---------------');
    //console.log(o.result.replace(o.command,"").trim());
    //console.log('---------------');

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

