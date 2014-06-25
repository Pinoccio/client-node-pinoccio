
var allthethings = require('../all-the-things');
var pdate = require('pretty-date');
require('colors');
// a nice list of a users troops and their status
module.exports = function(args,api,config,cb){

  allthethings(api,function(err,tree){
    if(err) {
      console.log('error getting state info.');
      return cb(err);      
    }

    Object.keys(tree).forEach(function(id){
      var troop = tree[id];
      console.log('['+(troop.name?troop.name+" ":"troop ")+id+"]");
      console.log(' '+(troop.online?'online'.green:'offline'.red));
      Object.keys(troop.scouts).forEach(function(id){

        var scout = troop.scouts[id];

        //console.log(scout);
        
        console.log('  ['+(scout.name?scout.name+" ":"scout ")+id+"]");

        var available = troop.online && scout.available.available;

        if(available) {
          process.stdout.write("  available".green+"\n");
        } else {
          process.stdout.write("  unavailable".grey+"\n")
        }
        console.log('  last heard from '+pdate.format(new Date(scout.lastCheckIn)));

  
        if(available) {
          //
          Object.keys(scout).forEach(function(k){
            if(k == 'lastCheckIn' || k == 'available' || k == 'id' || k == 'time') return;
            process.stdout.write("    "+k+":\t"+JSON.stringify(scout[k])+"\n");
          });
        }

        console.log("");

      })
    });
    cb();
  });
}


