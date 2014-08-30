// pinoccio add-scout
// configure a scout to be in a troop or make a troop

var serial = require('pinoccio-serial');
var allthethings = require('../all-the-things');
require('colors');

module.exports = function(args,api,config,cb){
  // get the serial devices.

  var targetTroop = pick(args.t,args.troop,args._[1]);
  var targetScout = pick(args.s,args.scout,args._[2]);

  var o = serial(); 

  var ports = false;
  var tree;

  o.list(function(err,list){
    if(err) {
      console.log('error listing boards!');
      return once(err);
    }
    ports = list;
    if(tree) next();
  }); 

  allthethings(api,function(err,o){
    if(err) {
      console.log('error getting api data.');
      return once(err);
    }

    tree = o||{};
    if(ports) next();

  });


  function next(){

    var fail = false;
    var numTroops = Object.keys(tree).length;

    if(!numTroops) {
      console.log("Welcome! lets create your first troop.");
      targetTroop = 0;
    }


    if(targetTroop == undefined) {

      console.log("Please provide a troop id or 0 to create a new troop");
      console.log("  --tname can be passed to set the troop name\n")
      fail = true;
    }


    if(targetScout === undefined && targetTroop != 0) {
      console.log("Please provide a scout id or 0 to create a new scout");
      console.log('if troop is 0 scout id is optional');
      console.log("  --name can be passed to set the scout name\n");
      fail = true;
    }


    var online = [];
    var recent = [];
    // troop ids
    Object.keys(tree).forEach(function(id){
      if(tree[id].online) online.push(tree[id]);
      recent.push(tree[id]); 
    })

    recent = recent.sort(function(o1,o2){
      return o1.lastCheckIn>o2.lastCheckIn?-1:(o1.lastCheckIn<o2.lastCheckIn?1:0);
    });


    if(fail) {
      console.log("  pinoccio add -t $troopId -s $scoutId\n  pinoccio add --troop $troopId --scout $scoutId\n    or as the first argument\n  pinoccio add $troopId $scoutId\n");

      if(online.length) {
        console.log('Online troops:'.green);
        console.log(online.map(function(o){
          return o.id;
        }).join(",")+"\n");
      }
      
      if(recent.length) {
        console.log('Recently active troops:');
        console.log(recent.map(function(o){
          return o.id;
        }).join(",")+"\n");
      }

      console.log("run pinoccio troops for more troop and scout information");

      return once();
    }
    
    console.log(ports);
    console.log(tree);

    if(!ports.length){
      console.log('No scouts detected.'.red)
      console.log('Please plug in a scout. Make sure no '+'serial'.yellow+' or '+'bridge'.yellow+' connections are active.');
      console.log('If a scout is plugged in but it\'s still not found please turn it off, unplug it, plug it in, and turn it on again\n');
      return once();
    }

    // if this is in one of my troops already
    //  - move troop?
    //  - change scout id? / re mesh?
    // if this is not in one of my troops
    //  - what troop do you want this in?
    //  - new scout or become another scout?
    //


    var hasBridge = function(cb){
      o.command("help",function(err,help){
        cb(err,help?help.indexOf('hq.bridge') > -1:false);
      });
    }

    var isLeadScout = function(cb){
      /// TODO must be connected to wifi!
      // pinoccio wifi command should configure wifi
      o.command('wifi.report',function(err,wifi){
        cb(err,err?wifi:false);
      });
    }
    
    var createTroop = function(cb){

      var bridge;
      var lead;
      var c = 2;

      hasBridge(function(err,value){
        if(err) return once(err);

        bridge = value;
        if(!--c) done();
      });

      
      isLeadScout(function(err,value){
        if(err) return once(err);

        lead = value;
        if(!--c) done();
      });
      

      var data = {};
      if(args.tname) data.name = args.tname;


      // when i get an available event for this scout im online.

      api.rest({url:"/v1/troop",method:'POST',data:data},function(err,troop){
        console.log('CREATE TROOP!',err,troop);
        o.command("scout.sethqtoken(\""+troop.token+"\");mesh.setkey(\""+troop.token.substr(0,16)+"\");mesh.config(1,"+troop.id+",20);",function(err){

          console.log("troop created. run `pinoccio bridge` next to connect your troop and make it official.")

          if(err) {
            console.log('error setting up mesh on scout');
            return once(err);
          }

          once(false,troop);
        });
      });

      var called = false;
      function once(err,data){
        if(called) return;
        called = true;
        cb(err,data);
      }

    }

    if(targetTroop === 0){
      //
      createTroop(function(err){
        once(err);
      });
    // is troop id valid?
    } else if(targetTroop){
      console.log('join existing troop. #todo');
    }

    console.log('calling callback')

    once();
    
    /*
    var q = [

      function(){
        done();
      }  
    ];

    var done = function(){
      if(q.length) q.shift()();
      else once();
    }

    done();
    */
  }

  var called = false;
  function once(err,data){
    if(called) return;
    called = true;
    cb(err,data);

    // for now
    process.nextTick(function(){
      process.exit();
    });
  }
}

function pick(){
  for(var i=0;i<arguments.length;++i){
    if(arguments[i] !== undefined) return arguments[i];
  }
}
