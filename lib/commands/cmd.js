// command command!

var rest = require('./rest.js');

module.exports = function(args,api,config,cb){
  rest({
    method:'post',
    service:'/v1/'+(args._[1]||args.t||args.troop)+'/'+(args._[2]||args.s||args.scout)+'/command',
    _:{
     3:{command:args._[3]||args.c||args.command}
    }
  },api,config,cb)

}


module.exports.usage = "cmd\n"
+"\n "
+"Usage:\n"
+"  pinoccio cmd [troop] [scout] [command]\n"
+"    -t --troop or first\n"
+"    -s --scout or second\n"
+"    -c --command or third\n"
+"      led.red or \"print temerature.f\" for example\n"
+"\n"
+"run commands on scouts in your troop.\n"
+"\n"

