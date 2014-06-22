var serial = require('pinoccio-serial');
var bridge = require('pinoccio-bridge');

require('colors');

module.exports = function(args,api,config,cb){
  console.log('THIS IS EXPERIMENTAL.'.red);
  console.log("you even need custom firmware to use it right now. when its not i'll remove this message and tweet like a crazy.");

  process.stdout.write("If you have a lead scout (one with a wifi backpack) plug it in instead of a field scout  or remove the backpack.".yellow+"\n");


  var port = args.port||args.p||args._[1];
  var verbose = args.v?true:args.verbose;

  if(!port) {
    var o =  serial();
    o.list(function(err,list){
      if(list.length > 1) {
        console.log('you have more than one scout connected.');
        console.log('"'+list.join('" "')+'"');      
      }

      list = list.sort();// always bridge with the same port where we can.

      console.log('bridging with ',list[0].green);
      process.stdout.write('the led will become '+"light purple".magenta+"\n");

      conBridge(list[0]);
      
    })
  } else {
    conBridge(port);
  }


  function conBridge(port){
    var opts = {};
    // override api server for testing. this is the bridge hostname
    if(args.host) {
      opts.host = args.host;
      console.log('starting bridge with options ',opts);
    }

    var s = bridge(port,opts,function(err,b){

      if(err) return cb(err);

      b.on('error',function(err){
        cb(err);
        cb = function(){};
      }).on('end',function(){
        cb(false,false);
        cb = function(){};
      })

      process.stdout.write('bridge '+'online.'.green+'\n');
      process.stdout.write('ctrl+c'.orange+' to exit\n');

      b.bridgeCommand('led.sethex("663399")',function(err){
        if(err) console.log('error');
        console.log('bridge ready.');
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
+"\n"
+"use a scout's serial as a bridge instead of wifi!\n"
+"\n"

 
