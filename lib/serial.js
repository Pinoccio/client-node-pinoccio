

var serialport = require('serialport');
var bitlash = require('./bitlash-stream');
var rpc = require('./bitlash-rpc');
 
// queue commands to run one at a time over serial

module.exports = function(){

  var o = {
    // look for connected pinoccios
    list:function(cb){
      serialport.list(function (err, ports) {
        if(err) return cb(err);
        var pinoccios = [];
        ports.forEach(function(port) {
          if(port.pnpId.indexOf('Pinoccio') > -1 || port.manufacturer.indexOf('Pinoccio') > -1){
            pinoccios.push(port.comName);
          }
        });
        cb(false,pinoccios,ports);
      });
    },
    connect:function(com,cb){
      serialConnect(com,function(err,port){
        if(err) return cb(err);

        var bl = bitlash(port);
        // hack the interface to end the same way as serial port because the serialport is not public.
        bl.on('end',function(){
          port.close();
        })

        bl.close = function(){
          bl.end();
          port.close(function(err){
            console.log('closed with error?',err);
          });
        }
        var opened = false;

        // if serial has been idle for 20 secs and i have no prompt.
        (function fn(){
          if(opened) return;
          var t = Date.now();
          if(t-bl.lastData >= 20000) {
            cb(new Error('bitlash: did not find prompt after serial was idle for over 20 seconds.'));
            cb = function(){};
          } else {
            setTimeout(fn,1000).unref();
          }
        }());

        bl.on('open',function(){
          opened = true;
          cb(false,bl);
        });

        bl.command = rpc(bl);
      });
    }
  };

  function serialConnect(com,cb){
    var serialPort = new serialport.SerialPort(com, {
      baudrate: 115200
    });
    serialPort.on('open',function(err){
      if(err) return cb(err);
      cb(false,serialPort);
    }).on('error',function(err){
      console.error('serial error: ',err);
    })
  }

  return o;
}
