// flash a batch of pinoccios!
var compile = require('pinoccio-arduino-compile');
var watchs = require('watch-serial');
var fs = require('fs');
var pserial = require('pinoccio-serial');
var spawn = require('child_process').spawn
var domain = require('domain')
var path = require('path');

var throttle = require('../throttle');

var inc = 30;

try{
  var resetusb = require('reset-usb');
}catch(e){
  // no reset-usb
}

// keep a map of scout serial numbers to if they have been flashed or not.
var serials = {}

// test.js need process.argv[2] is going to be the tty

module.exports = function(args,api,config,cb){

  var throttler = throttle(5);

  // args - hexpath, avrdude, test.js
  //
  var avrdude = config.avrdude||args.avrdude;
  var avrconf = config.avrdudeconf||args.avrdudeconf;

  var i = 0;
  var hex = args.h||args.hex||args._[++i];
  var testFile = args.t||args.test||args._[++i];
  if(!testFile) testFile = path.resolve(__dirname,path.join('..','testscout.js'));
  else testFile = path.resolve(process.cwd(),testFile);

  var errors = [];

  if(!hex) errors.push(' missing hex argument use --hex /path/to-hexfile.hex or just add it as the next argument') 
  if(!avrdude) errors.push(' missing avrdude argument use --avrdude /path/to/avrdude bin, or just add it as the next argument ,save it forever with pinoccio config avrdude /path/to/avrdude');
  if(!avrconf) errors.push(' missing avrdude config argument use --avrdudeconf /path/to/avrdude.conf, or just add it as the next argument ,save it forever with pinoccio config avrdude /path/to/avrdude');
  
  if(errors.length) {
    return cb(errors.join("\n"));
  } 

  var stats = {plugged:0,flashed:0,resets:0,attempts:0,tested:0,passed:0}; 
 
  fs.stat(hex,function(err,stat){
    if(err) return cb('missing hex file. '+err);
    
    console.log('flashing ',hex,' to all scouts that connect!');

    var s = watchs();
     

    s.on('data',function(data){
      var boardData = data;
      var watchid = data.id;
      var device = data.device;

      var id = data.device.pnpId||data.device.serialNumber||watchid;

      if(!serials[id]) {
        serials[id] = {success:false,attempts:0};
        stats.plugged = 1;
      }

      if(data.event == 'plug'){

        var attempts = 0;

        doUpload();

        function doUpload(){
          if(serials[id] && serials[id].success){
            console.log('this scout is already up to date!');
            return '';
          }


          if(serials[id].uploading) {
            console.log(id,'> this board is already getting flashed');
            return false;
          }

          serials[id].uploading = true;

          var killed = false;

          var uploadDone = function(err,data){
            if(!err && !killed) {
              console.log(id+'> successfully flashed scout! testing.');

              stats.flashed++;

              throttler(function(done){
                runTest(device.comName,function(exit,err,out){
                  stats.tested++;


                  console.log(exit,err,out);


                  if(!exit) stats.passed++;

                  done();
                  serials[id].uploading = false;
                  console.log(id+"> test complete!",exit);
                });
              });

            } else if(serials[id].attempts < 4 && resetusb){
              console.log(id+'> resetting usb device');
              serials[id].uploading = false;

              resetusb(device.comName,function(err,data){
                if(err) {
                  console.log(id+"> ERROR serial is stuck! you need to run this with sudo to allow me to reset usb!");
                  return console.log(id+"> fail to flash this scout =( "+id+" plug/unplug and stuff");
                } else {
                  stats.resets++;
                }

                // a delay to allow port to be reloaded.
                setTimeout(function(){
                  if(serials[id]) {
                    if(s.boards[watchid] && serials[id] && !serials[id].uploading){
                      // the board came back as the same serial device after being reset.
                      s.emit('data',boardData);
                    } 
                  }
                },2000);

                stats.attempts++;
                // this should reconnect 
                serials[id].attempts++;;
                 
              });
            } else {

              serials[id].uploading = false;
              console.log(id+"> fail to flash this scout =( plug/unplug and stuff");
            }
          };
  
          throttler(function(done){
            var s = compile.upload(hex,{
              port:device.comName,
              avrdude:avrdude,
              config:avrconf 
            },function(){
              done();
              uploadDone.apply(this,arguments);
            });

            var stkTimeout = false;

            var buf = "";
            s.on('data',function(data){
              buf += data;
              console.log(id+"> "+data);
              if(buf.indexOf('stk500v2_ReceiveMessage(): timeout') > -1) {
                // abort stk 500!
                killed = true;
                s.proc.kill("SIGKILL");              
              }
            });
          });
        };

      } else if(data.event = 'unplug'){
         // unplug while flashing? 
      }
      console.log('w serial data>> '+JSON.stringify(data));
    })

  });


  setInterval(function(){
    stats.pending = throttler._.active; 
    console.log('//stats: '+JSON.stringify(stats));
  },5000);

  function runTest(device,cb){
    var proc = spawn('node',[testFile,device,++inc]);

    var out = [];
    var err = [];
    var exit = 0;

    var c = 0;
    var end = function(){
      if(++c < 3) return;
      clearTimeout(t);
      cb(exit,Buffer.concat(out),Buffer.concat(err));
    }

    proc.on('exit',function(e){
      exit = e;
      end();
    });

    proc.stdout.on('data',function(data){
      console.log(device+" out: "+data);
      out.push(data);
    }).on('end',end);
    proc.stderr.on('data',function(data){
      console.log(device+" err: "+data);
      err.push(data);
    }).on('end',end);

    // 15 seconds to run test?
    var t = setTimeout(function(){
      if(end < 3) proc.kill("SIGKILL");
    },30000);

  }
 
}

//pinoccio batch-flash ./bootstrap.hex ./lib/testscout.js --avrdude /home/soldair/arduino_party/arduino-1.5.7/hardware/tools/avr/bin/avrdude --avrdudeconf /home/soldair/arduino_party/arduino-1.5.7/hardware/tools/avr/etc/avrdude.conf

module.exports.public = true;

module.exports.usage = "batch-flash\n"
+"\n"
+"  flash the same hex to many scouts\n"
+"\n"
+"Usage:\n"
+"  pinoccio batch-flash[hex file] [js test file (optional)] [options]\n"
+"    -h --hex <file>                hex file to flash\n"
+"    -t --test <file>               the test to run to verify the firmware or test something.\n"
+"    --avrdude                      path to avrdude with boards.txt that has the pinoccio\n"
+"    --avrdudeconf                  path to the avrdude config file\n"
+"  if you set the flags \"avrdude\" and \"avrdudeconf\" in config they become optional. `pinoccio config set avrdude pathtoavrdude`"
+"\n"
