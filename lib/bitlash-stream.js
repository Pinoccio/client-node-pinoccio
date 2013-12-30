
var through = require('through');
var split = require('binary-split');
var _prompt = ">".charCodeAt(0);

module.exports = function(serialPort){
  var delim = "\n"
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

  var resultbuf = '';
  serialPort.pipe(split()).on('data',function(buf){
    if(state == 'prompt') {
      // i can ignore data comming from here until a command is issued
      //console.log('prompt###',buf+'');

    } else { 

      if(buf[0] == _prompt) {

        //console.log('end of result###',buf+'');

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

        //console.log(state,'result###',buf+'');
        resultbuf += buf+"\n";
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
