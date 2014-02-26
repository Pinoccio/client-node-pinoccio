var serial = require('../serial');
var rl = require('../rl');
module.exports = function(args,api,config,cb){
  var o = serial();

  o.list(function(err,data){

    if(args._[1] && data.indexOf(args._[1]) > -1) args.d = args._[1]
    if(args.device) args.d = args.device;
    if(args.d){
      if(data.indexOf(args.d) > -1) {
        o.connect(args.d,function(err,bl){
          if(err) throw err;
          console.log('starting bitlash repl for ',args.d)
          var repl = rl();

          repl.setPrompt('> ');
          repl.prompt();
          repl.on('line',function(line){

            bl.command(line+'',function(err,data){
              if(err) process.stderr.write('<err>'+err+"\n");
              else {
                console.log(data.substr(line.length+2));
                repl.prompt();
              }
            });
          }).on('SIGINT',function(){
            console.log('close')
            process.exit()
            cb();
          })

        });
      } else {
        console.log('device ',args,d,'is not connected');
        cb();
      }
    } else {
      process.stdout.write('"'+data.join('" "')+'"\n');
      cb();
    }
  })
}


module.exports.public = true;

module.exports.usage = "serial\n"
+"\n"
+"  lists scouts and may\n"
+"  open a repl/command line to a scout\n"
+"\n "
+"Usage:\n"
+"  pinoccio serial\n"
+"    prints ther serial device of all of the connected pinoccios\n"
+"  pinoccio serial device\n"
+"  pinoccio serial -d device\n"
+"  pinoccio serial --device device\n"
+"    -d --device or the [second argument] <the serial device identifier>\n"
+"    instead of a repl expect commands from stdin and print to stdout\n" 
+"\n"
+"\n"
+"this command prints who you are if you are logged in.\n"
+"\n"



