// default test for a scout to verify flash of firmware, (batch-flash)

var timer = false;

// args come in like 
//    node [test file] [tty] 

var tty = process.argv[2];

var serial = new (require('serialport').SerialPort)(tty,{baudrate:115200},function(err){
  if(err) {
    process.stderr.write(err+"\n");
    process.exit(1);
  }

  timer = setTimeout(function(){
    process.stderr.write('1: did not get a prompt in 10 seconds.\n');
    process.exit(3);
  },10000);

});

serial.on('scout-ready',function(data){
  setTimeout(function(){

    // field 
    var cmd = false;
    if(data.indexOf('Field Scout ready') > -1){
      cmd = 'led.cyan';
    } else {
      cmd = "led.blue";
    }

    command(cmd,function(err,data){
      // woooooooo
      if(err) throw err;
      console.log('success');
      process.exit(0);
    });

  },10000);
});


var readyBuf = '';
var ready = false;
var search = "\n>";
var callbacks = [];
  
serial.on('data',function fn(data){
  process.stdout.write(data);
  readyBuf += data;
  if(readyBuf.indexOf(search) > -1){
    if(!ready) serial.emit('scout-ready',readyBuf);
    else {
      setImmediate(function(){
        if(callbacks.length) {
          var args = callbacks.shift();
          args[1](false,readyBuf);
          if(callbacks.length) {
            commandTimeout();
            console.log('setting timer');
            serial.write(callbacks[0][0]+"\n");
          }
        }
      });
    }

    ready = true;
    console.log('clearing timer.')
    clearTimeout(timer);
    timer = false;

    readyBuf = '';
  }
})


function command(command,cb){
  callbacks.push([command,cb]);
  if(callbacks.length == 1){
    commandTimeout();
    serial.write(command+"\n");
  }
}

function commandTimeout(){
  clearTimeout(timer);
  timer = setTimeout(function(){
    process.stderr.write('2 did not get a prompt in 10 seconds.\n');
    process.exit(3);
  },10000);
}
