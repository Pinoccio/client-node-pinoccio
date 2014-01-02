#!/usr/bin/env node
/*

*/


var pinoccio = require('../');
var serial = require('../lib/serial');
var argv = require('optimist').argv;
var conf = require('../lib/config')

var commands = {
  "login":function(args,cb){
    // use:
    var email = args.e||args.email||args.u||args.user||args.username;
    var password = args.p|| args.pass||args.password;

    if(!email || !password){
      console.log('emnail and password required.')
      console.log(' -e -email')
      console.log(' -p -pass')  
      cb()
    }

  },
  "register":function(args,cb){

  },
  "provision":function(args,cb){

  },
  "rest":function(args,cb){

  },
  "serial":function(args,cb){
     
  }
}

var commandList = Object.keys(commands).join(',');

conf(function(err,config){
  if(err) {
    console.log('error loading config! ',err);
  }

  if(!argv._.length) {
    exitmsg("missing command. please specify a command first. available commands are "+Object.keys(commands).join(','));
  }

  var command = argv._.trim().toLowerCase();

  console.log(argv);
  if(!commands[command]) {
    exitmsg("unknown command. available commands are "+Object.keys(commands).join(','));
  }


  if(command === 'login' || command === 'register') {
    commands[command](argv,function(err,data){
      if(data) {
        config.token = data.token
        conf.save(config,function(err){
          if(err) console.error('error',command,'config.save',err+'');
          else console.log('logged in');
          process.exit();
        });

      } else console.error('error',command,err+'');
    })
  } else if(command != 'serial') {
    // required token
    if(!conf.token) {
      exitmsg("you must login or register first. try 'pinoccio register' ");
    }

    commands[command](argv,function(err,data){
      if(err) console.error('error',command,err+'');
      else console.log(data);
    }); 

  } else {
    // run serial.
    console.log('TODO');
  }

  

})

function command(){

}



function exitmsg(msg){
  console.error(msg);
  process.exit();
}



