
var DEBUG = process.env.DEBUG;

var through = require('through');
var _prompt = ">".charCodeAt(0);
var bindexof = require('buffer-indexof');
var empty = new Buffer(0);
var thprefix = new Buffer("telehash:");
var telehash = require("telehash").init({id:require("path").resolve("id.json"),seeds:{}},function(err){
  if(err) console.log("telehash init failed",err);
});
module.exports = function(serialPort){
  var delim = new Buffer("\n")
  , state = 'start'
  , running = false
  , q = []
  ;

  function packet2serial(msg)
  {
    while(msg.length)
    {
      s.command("telehash(\""+msg.slice(0,100).toString("hex")+"\")\n");
      msg = msg.slice(100);
    }
    s.command("telehash(0)\n");    
  }
  telehash.deliver("local",function(to,msg){
    packet2serial(msg);
  });

  var s = through(function(command){
    if(typeof command == 'string') command = {command:command};
    if(!command || !command.command) return;
    debug("queuing",command.command);
    q.push(command);
    run();  
  });

  s.lastData = Date.now();
  
  var bufs = empty;
  var resultbuf = '';
  // i write out a line at a time
  serialPort.on('data',function(buf){
    s.emit('log',buf);
    s.lastData = Date.now();
    bufs = Buffer.concat([bufs,buf]);
//    console.log("BUF",bufs.length,bufs.toString("utf8"));

    var idx;
    while((idx = bindexof(bufs,delim)) > -1){
      this.emit('line',bufs.slice(0,idx+1));
      bufs = bufs.slice(idx+1);
    }

    if(bufs[0] == _prompt){// the prompt is not followed by a new line this just helps keep the state machine in a single block.
      // TODO
      // sometimes when you connect to serial a bit of data from the previous run may get flushed.
      // if there is not a "Wi-Fi backpack connecting.." message for a lead scout after the prompt then im good.
      // ill wait just a bit just to make sure.

      this.emit('line',bufs);
      bufs = empty;
    } 
  }).on('line',function(buf){
    var thindex = bindexof(buf,thprefix);
    if(thindex >= 0)
    {
      var raw = new Buffer(buf.slice(thindex+thprefix.length).toString(),"hex");
      buf = buf.slice(0,thindex);
      var packet = telehash.pdecode(raw);
      if(packet)
      {
        console.log("got packet");
        if(packet.js.type == "ping")
        {
          var js = {type:"pong",from:telehash.parts,trace:packet.js.trace};
          var msg = telehash.pencode(js,telehash.cs["1a"].key);
          packet2serial(msg);
        }else{
          telehash.receive(raw, {type:"local"});
        }
      }else{
        console.log("packet decode failed?",raw.length,raw.toString("hex"));
      }
    }
    if(state == 'prompt') {
      // i can ignore data comming from here until a command is issued
      debug('between###',buf+'');

    } else { 

      if(buf[0] == _prompt) {

        debug('end of result###',buf+'');

        if(state == 'result') {
          // transform stream baby!
          running.result = resultbuf;
          s.queue(running);
        } else {
          setImmediate(function(){
            s.emit('open');// the bitlash prompt is up.
          });
        }

        resultbuf = [];
        running = false;
        state = 'prompt';
        run();
      } else {

        debug(state,'result###',buf+'');
        resultbuf += buf;
      }

    }
  });

  function run(){
    if(state == 'prompt' && q.length) {
      state = 'result';
      var command = q.shift();
      running = command;
      debug('sending '+command.command,q.length);
      serialPort.write(command.command.trim()+"\n");
    }
  }
  return s;
}


function debug(){
  if(!DEBUG) return;
  console.log.apply(console,arguments);
}
