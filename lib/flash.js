
var stk500 = require('stk500-v2');
var serialport = require('watch-serial').serialport;
var intel_hex = require('intel-hex');
var fs = require('fs');


module.exports = function(comName,hex,cb){

  console.log('flashing ',comName);

  var pageSize = 256;
  var baud = 115200;

  var signature = new Buffer([0x1e, 0xa8, 0x02]);

  var options = {
    timeout:0xc8,
    stabDelay:0x64,
    cmdexeDelay:0x19,
    synchLoops:0x20,
    byteDelay:0x00,
    pollValue:0x53,
    pollIndex:0x03
  };

  var serialPort = new serialport.SerialPort(comName, {
    baudrate: baud,
    parser: serialport.parsers.raw
  },function(err){
    console.log('serial open. ',comName);
    step(err);
  });

  var programmer = stk500(serialPort);

  var done = function(err,data){
    serialPort.close(function(){
      cb(err,data);
    });
  }

  // do it!
  var q = [
    function(){
      console.log('sync');
      programmer.sync(5, step);
    },
    function(err){
      console.log('verify sig');
      programmer.verifySignature(signature, step)
    },
    function(){
      console.log('enter prog');
      programmer.enterProgrammingMode(options, step);
    },
    function(){
      console.log('upload');
      programmer.upload(hex, pageSize, step);
    },
    function(){
      console.log('exit prog');
      programmer.exitProgrammingMode(step);
    }
  ];

  function step(err){
    console.log('step');
    if(err) return done(err);
    else if(q.length) q.shift()(step);
    else done();
  };
  return programmer;
}

module.exports.loadHex = function(hex){
  var data = fs.readFileSync(hex);
  var hex = intel_hex.parse(data).data;
  return hex;
}
