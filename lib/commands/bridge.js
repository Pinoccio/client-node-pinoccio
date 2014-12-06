var serial = require('pinoccio-serial');
var bridge = require('pinoccio-bridge');
var json = require('../json');
var serialWatcher = require('watch-serial');
var cp = require('child_process');
var split = require('binary-split');
var shuffle = require('shuffle-array');
var pingid = 0;

try{
  var resetUsb = require('reset-usb');
} catch(e){}



require('colors');

// todo logging stream.

module.exports = function(args,api,config,cb){

  // leave the int handler to me.
  process._pinoccio_ignore_int = true;

  //process.stdout.write("If you have a lead scout (one with a wifi backpack) plug it in instead of a field scout or remove the backpack.".yellow+"\n");
  var verbose = args.v?true:args.verbose;
  var port = args.port||args.p||args._[1];
  var pingInterval = args.ping||30000;
  var pingCommand = "uptime.report";

  if(pingInterval < 1500) pingInterval = 1500;

  if(!port) port = args.d||args.device; 


  // override api server for testing. this is the bridge hostname
  var bridgeHost = args.host;

  // spawn workers with a specific uid/gid
  // if sudo was used spawn the worker processes as the user who ran sudo rather than root for security.
  var handleUid = process.getuid && process.setuid;
  if(handleUid) {
    var uid = +(args.uid||process.env.SUDO_UID||process.getuid());
    var gid = +(args.gid||process.env.SUDO_GID||process.getgid());

    // todo make sure this doesnt have holes. ;)
    var isRoot = process.getuid() === 0;

    if(isRoot && uid === 0) {
      // i ran this command as root without sudo.
      console.log("Warning. workers will be run as the root user.\n".red+" This exposes you to quite a bit of security risk. please specify --uid <a uid that has access to serial> to run workers safely.");
    }
  }

  // parent. forks off bridges based on plugged in devices.
  if(!args.worker){

    if(!isRoot && resetUsb) {
      console.log("Warning. Run as root please so i can reset usb ports if they get stuck.".yellow);
    }

    // if you specify a tty device with a port or device arg the intention is to bridge with that device.
    // if it becomes unplugged and is plugged in again it should be used even if the tty device name is not the same.
    var pnpId = false; 
    var serialBridge;
    var connected = false;
    // track serial_timeout errors and attempt to trigger  
    var attempts = 0;

    // if a device arg is provided always pick it if it's plugged in. 

    // connected to

    console.log('scanning for scouts.');

    var pinoccios = [];
    var watchs = serialWatcher();
    watchs.on('data',plugHandler)
    .on('data',function(d){
      if(!connected){
        var shouldBeConnected = false;
        pinoccios = [];
        Object.keys(watchs.boards).forEach(function(id){
            var b = watchs.boards[id];
            if(b.pnpId == '') b.pnpId = b.serialNumber||id;

            if(isPinoccio(b)) {
              pinoccios.push(b);
              if(b.pnpId === pnpId){
                shouldBeConnected = true;
              }
            }
        });

        if(shouldBeConnected){
          // log this and call plug handler.
          console.log("the bridge scout should be connected as bridge but is not yet.");
        } else if(pinoccios.length ){
          console.log((pinoccios.length+" scouts connected, but none of them are the scout we chose as bridge.\nctrl+c to select another bridge scout.").yellow) 
        }

      }
    });

    // best effort to kill the child on exit conditions.
    process.on('exit',function(){
      if(connected) connected.kill("SIGKILL");
      connected = false;
    });

    var kill = false;
    var repeatTimer = false;
    var intHandler = function(){
      if(repeatTimer) return;
      if(!kill) {
        console.log('ctrl+c again to exit. starting connection with new bridge scout.');
        pnpId = false;
        setTimeout(function(){
          kill = false;
          deviceScan();
        },2000);
      }
      // make sure child is stopped.
      if(connected) connected.kill("SIGKILL");
      connected = false;
      if(kill) {
        console.log('killing!!!');
        process.exit();
      }

      // sometimes if you hold ctrl+c too long you get a super quick extra sigint
      repeatTimer = true;
      setTimeout(function(){
        repeatTimer = false;
        kill = true;
      },200);
    };

    process.on('SIGINT',intHandler);
    process.on('SIGTERM',function(){
      if(connected) connected.kill("SIGKILL");
      connected = false;
      process.exit();
    })


  } else {
    if(isRoot && uid){
      process.initgroups(uid,gid);
      console.log("<worker> "+("Ran as root =). dropping permissions to uid "+uid+" and gid "+gid+".").cyan);
      process.setgid(gid);
      process.setuid(uid);
    }

    var b = conBridge(port);
    process.on('message',function(o){
      if(!o.command) return;
      b.bridgeCommand(o.command,function(err,data){
        process.send({error:err?err+'':undefined,data:data,req:o});
      });
    });

  }

  function plugHandler(data){
    // mac doesnt have pnpId
    if(data.device.pnpId == "") {
      data.device.pnpId = data.device.serialNumber||data.device.id;
    }

    if(!connected && data.event == "plug"){

      console.log("<parent>",data.event,data.device.pnpId);
      if(pnpId) {
        //replug
        if(pnpId === data.device.pnpId) {
          port = data.device.comName;// set the port value to the new port for this device.
          fork(port); 
        }
      } else if (port == data.device.comName || isPinoccio(data.device)) {
        // this port check is important here because we want people to be able to bridge with devices that dont identify as pinoccios.
        pnpId = data.device.pnpId;
        port = data.device.comName;
        fork(port);
      }
      console.log('device plugged in!',data.device); 
    } else if(data.event === "unplug" && data.device.comName == port && connected){
      // if the unplug is long enough for me to detect it kill the process instead of waiting to handle command timeout errors.
      connected.kill("SIGKILL");
      connected = false;
    }
  }

  // rpc to worker process for commands.
  function bridgeCommand(command,cb){
    if(!connected) return setImmediate(function(){
      cb('killed');
    });

    if(!connected.pings) connected.pings = {};
    var id = ++pingid;
    var timer;
    connected.pings[id] = function(err,data){
      clearTimeout(timer);
      delete connected.pings[id]
      cb(err,data);
    };
    connected.send({command:command,cb:id});
    // set 5 second time limit for callback.
    timer = setTimeout(function(){
      cb("timeout");
    },5000);
  }

  function fork(port){


    if(connected) throw "already connected!"

    var node = process.argv[0];
    var file = process.argv[1];
    var bridge = process.argv[2];
    var cannotOpen = false;


    console.log('Starting bridge worker.');
    if(handleUid){
      console.log("Worker being forked with uid "+uid+" and gid "+gid);
    }

    var args = [bridge,'--worker','--port',port,'--uid',uid,'--gid',gid];
    if(verbose) args.push('-v');
    if(bridgeHost) args.push('--host',bridgeHost);

    var module = __dirname+"/../../bin/pinoccio.js";
    connected = proc = cp.fork(module,args,{silent:true});


    var pingVerify;

    // handle ping callbacks.
    connected.on('message',function(o){
      if(o.type == "ping"){
        return pingVerify = Date.now();
      }
      if(!connected || !o.req) return;
      if(connected.pings[o.req.cb]) connected.pings[o.req.cb](o.error,o.data);
    });

    connected.on('exit',function(){
      if(!this.pings) return;
      var pings = this.pings;
      this.pings = {};
      var keys = Object.keys(this.pings)
      while(keys.length) pings[keys.shift()]('killed');
    });

    // make sure i can still run bridge commands. check every minute.
    var ping;
    var startPings = function(){
      pingVerify = Date.now();
      (function pinger(){
        bridgeCommand(pingCommand,function(err,data){

          if(connected !== proc) return;

          if(err === "killed") return; 
          if(err) {
            console.log("<parent> ping error \""+err+"\". worker did not respond to health check ping. killing.");
            return connected.kill("SIGKILL");
          }
          if(verbose){
            console.log("<parent> ping successful. "+(new Date()))
          }

          // ideally we add a hq.isbridging property
          if(Date.now()-pingVerify > pingInterval*2) {
            console.log("<master> ping's have not been verified for ",Date.now()-pingVerify,'ms. killing.');
            return connected.kill("SIGKILL");
          }

          ping = setTimeout(pinger,pingInterval);
        });

        

      }());
    };


    var c = 0;
    var exits = 3;
    var exit = 0;
    var exited = function(){
      if(++c < exits) return;
      console.log("<parent> worker process exited");
      connected = false;
      // check to see if the board has been replugged already.
      if(cannotOpen) setTimeout(function(){
        cannotOpen = false;
        deviceScan();
      },1000);
      else deviceScan();
    }

    proc.on('exit',function(code){ 
      clearInterval(ping);
      var exit = code;
      exited();
    });

    // read heartbeat from child process?
    // watch for timeout errors.
    proc.stdout.on('end',function(){
      exited();
    }).pipe(process.stdout,{end:false});

    proc.stdout.pipe(split()).on('data',function(l){
      l = l+'';
      if(l.indexOf('Bridge is open') > -1) {
        // connected!
        console.log("<parent> bridge established "+pnpId);
        setTimeout(startPings,pingInterval);
        attempts = 0;
      }
      
    })

    proc.stderr.on('end',function(){
      exited();
    }).pipe(split()).on('data',function(l){
      l = l+'';
      if(l.indexOf("Error: Cannot open") > -1){
        // this happens when a serial device is just plugged in. 
        //though it shows up in the list the serial open fails a number of times before it's able to connect.
        cannotOpen = true;

      } else if(l.indexOf('"code":"SERIAL_TIMEOUT"') > -1){
        // call reset usb on this serial device if avilable. something is wrong.
        // most of the time this is because another apopliaction has serial open. 
        // if attempts is 3
        
        ++attempts;
        if(attempts > 2){
          console.log("\n<parent> "+("usb serial "+port+" is still stuck after "+attempts+" attempts to connect!").yellow);
          console.log("<parent> "+"hate to ask but did you check the switch?".magenta+"\n");
          attempts = 0;
          var keys = Object.keys(watchs.boards);
          if(keys.length > 1){
            var scouts = [];
            keys.forEach(function(k){
              if(isPinoccio(watchs.boards[k]) && watchs.boards[k].comName != port){
                scouts.push(watchs.boards[k]);
              }
            });

            if(scouts.length) {
              // clearing pnpId here will cause it to look for a different device.
              pnpId = false;
              shuffle(scouts);
              // force it to select a different board at random
              port = scouts[0];
              console.log("trying another board ",port);
            }
          } else {
            console.log("MANUAL INTERVENTION may be required. ill keep trying though. :/");
          }
        } else if(resetUsb){
          console.log("trying to reset the usb device.");
          if(!isRoot) {
            console.log('can\'t reset usb because im not root!');
          } else {
            exits++;
            resetUsb(port,function(err){
              if(err) console.log("error resetting usb device attached as "+port+". "+err);
              else console.log("successfully reset usb "+port);
              exited();     
            });
          }
        } else {
          console.log('cannot reset usb device. if you are on linux you can run this command with sudo and ill be able to reset usb devices if they get stuck.')
        }
      }
    });
    proc.stderr.pipe(process.stderr,{end:false});
  }


  function conBridge(port){
    var opts = {};

    if(bridgeHost) {
      opts.host = bridgeHost;
      console.log('bridging with options ',opts);
    }

    var cb = function(err){
      if(err) {
        err = err+'';
        var code = "BRIDGE_ERROR";
        if(err.indexOf("bitlash: did not find prompt after") > -1 ){
          code = "SERIAL_TIMEOUT";
        }
        
        process.stderr.write(JSON.stringify({type:"error",error:err+"",code:code})+"\n");
        process.exit(1);
      }
      process.exit(0);
    }

    console.log('Building bridge on ',port.green);
    var s = bridge(port,opts,function(err,b){

      if(err) return cb(err);

      if(!b) throw new Error('no bridge!');

      b.on('error',function(err){
        cb(err);
        cb = function(){};
      }).on('end',function(){
        cb(false,false);
        cb = function(){};
      })

      console.log("Connecting Scout, LED will be "+"purple".magenta+"...");

      b.bridgeCommand('led.sethex("663399");mesh.report',function(err,data){
        data = json(data);

        if(err) console.log('error');
        console.log('## Bridge is open ##'.green);
        if(data) {
          //console.log('troop id: '+data.troopid);
          //console.log('scout id: '+data.scoutid);
        } else {
          data = {};
          data.troopid = "troopid";
          data.scoutid = "scoutid";
          console.log('Could not determine this scout\'s troop. It might not be configured.');
        }

        process.stdout.write('Close with '+'ctrl+c'.yellow+'\n');
        console.log("To send commands, open a new terminal and use\n\n  pinoccio repl "+data.troopid+" "+data.scoutid+"\n");

      });
    });

    if(verbose) console.log('verbose!');


    s.on('data',function(data){
      if(verbose) {
        process.stdout.write(JSON.stringify(data)+"\n");
      }
      
      try{
        if(data && data.type == "report" && data.report.type == "uptime"){
          process.send({type:"ping"});
        }
      } catch(e){
        console.log('worker erroro '+e+'')
      }

    });

    
  

    return s;

  }

  // find the next eligble bridge scout.
  function deviceScan(){
    shuffle(Object.keys(watchs.boards)).forEach(function(id){
      plugHandler({event:'plug',device:watchs.boards[id]});
    });
  }

}

// dont require login
module.exports.public = true;

module.exports.usage = "bridge\n"
+"\n "
+"plug one of your scouts in to this computer with the usb cable and...\n"
+"\n"
+"Usage:\n"
+"  pinoccio bridge\n"
+"    -v --verbose \n"
+"      prints all events from troop to console.\n"
+"    --api \n"
+"      sets the api host name to bridge too. (for local command servers)\n"
+"    -d --device \n"
+"      sets the serial device to use as a pinoccio.\n"
+"      use this if the pinoccio is not detected as a pinoccio but you know its plugged and ready. \n"
+"\n"
+"  optional args\n"
+"    --ping\n"
+"      the interval in miliseconds used to verify the bridge scout is still responding. default 30000\n"
+"    --uid\n"
+"      specify the effective uid of the worker process. use when root. see setuid(2).\n"
+"      if you use sudo the default is the SUDO_USER env variable. default your uid\n"
+"    --gid\n"
+"      specify the effective gid of the worker process. use when root. see setgid(2). default your gid.\n"
+"\n"
+"use a scout's serial as a bridge instead of wifi!\n"
+"on linux its better to run as root so the master process can reset usb ports that may be stuck.\n"
+"\n"

function isPinoccio(port){
  var pnpId = port.pnpId||port.manufacturer||"";
  return pnpId.indexOf('Pinoccio') > -1;
}

// TODO.
// always try to connect to a scout and get it's mesh report.
// if it's on another troop it should bridge also.
function json(s){
  try{return JSON.parse(s)} catch(e){};
}

