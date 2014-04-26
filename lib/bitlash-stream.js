
var DEBUG = process.env.DEBUG;

var through = require('through');
var _prompt = ">".charCodeAt(0);
var bindexof = require('buffer-indexof');
var empty = new Buffer(0);
module.exports = function(serialPort){
  var delim = new Buffer("\n")
  , state = 'start'
  , running = false
  , q = []  
  ;

  var s = through(function(command){
    if(typeof command == 'string') command = {command:command};
    if(!command || !command.command) return;

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

    var idx;
    while((idx = bindexof(buf,delim)) > -1){
      bufs = Buffer.concat([bufs,buf.slice(0,idx+1)]);
      this.emit('line',bufs);
      bufs = empty;
      buf = buf.slice(idx+1);
    }

    if(buf.length){
      bufs = Buffer.concat([bufs,buf])
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
    if(state == 'prompt') {
      // i can ignore data comming from here until a command is issued
      debug('prompt###',buf+'');

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
      serialPort.write(command.command.trim()+"\n");
    }
  }
  return s;
}


function debug(){
  if(!DEBUG) return;
  console.log.apply(console,arguments);
}
