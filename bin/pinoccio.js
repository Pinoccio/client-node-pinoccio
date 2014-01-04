#!/usr/bin/env node

var pinoccio = require('../');
var serial = require('../lib/serial');
var argv = require('optimist').argv;
var conf = require('../lib/config')

var commands = {
  "login":require('../lib/commands/login'),
  "user":require('../lib/commands/user'),
  "register":function(args,cb){

  },
  "provision":function(args,cb){

  },
  "rest":function(args,cb){

  },
  "stream":function(args,cb){

  },
  "serial":function(args,cb){
     
  }
}

var commandList = Object.keys(commands).join(',');

conf(function(err,config){
  var api = pinoccio(config);

  if(err) {
    console.log('error loading config! ',err);
  }

  if(!argv._.length) {
    exitmsg("missing command. please specify a command first. available commands are "+Object.keys(commands).join(','));
  }

  var command = ((argv._||[])[0]||'').trim().toLowerCase();

  if(!commands[command]) {
    exitmsg("unknown command. available commands are "+Object.keys(commands).join(','));
  }

  if(!commands[command].public && !conf.token) { 
    exitmsg("you must login or register first. try 'pinoccio register' ");
  }

  commands[command](argv,api,config,function(err,data){

    if(command === 'login' || command === 'register' || command == 'logout') {
      if(data) {
        config.token = data.token
        conf.save(config,function(err){
          if(err) console.error('error',command,'config.save',err+'');
        });
      }
    }

    if(err) {
      console.error(err);
    } 
    //else if(data) {
    //  console.log(data);
    //}
  })

});

function exitmsg(msg){
  console.error(msg);
  process.exit();
}



