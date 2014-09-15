var serial = require('pinoccio-serial');
var bridge = require('pinoccio-bridge');
var json = require('../json');
require('colors');

module.exports = function(args,api,config,cb){

  //process.stdout.write("If you have a lead scout (one with a wifi backpack) plug it in instead of a field scout or remove the backpack.".yellow+"\n");

  var port = args.port||args.p||args._[1];
  var verbose = args.v?true:args.verbose;

  // support the -d option like serial
  if(!port) port = args.d||args.device; 

  if(!port) {
    var o =  serial();
    o.list(function(err,list){

      if(!list.length) {
        //
        console.log('could not find any pinoccios connected.');
        console.log('if at least one is connected please try to unplug, turn off and on, and replug');
        return cb();
      }


      if(list.length > 1) {
        console.log('you have more than one scout connected.');
        console.log('"'+list.join('" "')+'"');      
      }

      list = list.sort();// always bridge with the same port where we can.


      conBridge(list[0]);
      
    });
  } else {
    conBridge(port);
  }


  function conBridge(port){
    var opts = {};


    console.log('Building bridge on ',port.green);


    // override api server for testing. this is the bridge hostname
    if(args.host) {
      opts.host = args.host;

      console.log('with options ',opts);
    }



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
        console.log("To send commands, open a new window and use\n\n  pinoccio repl "+data.troopid+" "+data.scoutid+"\n");


      })
    });

    if(verbose) {
      console.log('verbose!');
      s.on('data',function(data){
        process.stdout.write(JSON.stringify(data)+"\n");
      });
    }

  }


}


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
+"use a scout's serial as a bridge instead of wifi!\n"
+"\n"

 
