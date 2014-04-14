#!/usr/bin/env node

var pinoccio = require('../');
var serial = require('../lib/serial');
var argv = require('optimist').argv;
var conf = require('../lib/config')
var loady = require('../lib/loady');

var commands = {
  "login":require('../lib/commands/login'),
  "logout":require('../lib/commands/logout'),
  "who":require('../lib/commands/who'),
  "token":require('../lib/commands/token'),
  "register":require('../lib/commands/register'),
  "rest":require('../lib/commands/rest'),
  "config":require('../lib/commands/config'),
  "serial":require('../lib/commands/serial'),
  //"provision":require('../lib/commands/provision') //<-- not ready yet
  //<-- add any serial connected scouts to troops
  // are you a lead scout?
  // do you have a token?
  //    no
  //      if scout list troops and add to troop
  //    yes
  //      
}

var commandList = Object.keys(commands).join(',');

conf(function(err,config){
  var api = pinoccio(config);

  if(err) {
    console.log('error loading config! ',err);
  }

  if(!argv._.length) {
    exitmsg("missing command. please specify a command first. available commands are "+Object.keys(commands).join(',')+"\n pinoccio help <command name> to get help for a command.");
  }

  var command = ((argv._||[])[0]||'').trim().toLowerCase();

  if(command === "help"){
    var helpcmd = ((argv._||[])[1]||'').trim().toLowerCase();

    var use = "Usage:\n"
    +"pinoccio help <command name>\n"
    +"where command name is one of "+Object.keys(commands).join(',')+"\n";

    if(!helpcmd.length) {
      exitmsg(use)
    } else if(!commands[helpcmd]){
      exitmsg("could not find command\""+helpcmd+"\"\n"+use);
    } else {
      exitmsg(commands[helpcmd].usage||' error no use information for this command right now.');
    }
    return;
  }

  if(!commands[command]) {
    exitmsg("unknown command. available commands are "+Object.keys(commands).join(','));
  }

  if(!commands[command].public && !config.token) { 
    exitmsg("you must login or register first. try 'pinoccio register' ");
  }

  commands[command](argv,api,config,function(err,data){

    if(command === 'login' || command === 'register' || command == 'logout') {
      if(data) {
        config.token = data.token
        conf.save(function(err){
          if(err) console.error('error',command,'config.save',err+'');
        });
      }
    }

    if(err) {
      console.error(err);
    } else if(data) {
      //console.log('OK');
      //process.exit(0);
    }
  })

});

function exitmsg(msg){
  console.error(msg);
  process.exit();
}


process.on('exit',function(){
  loady.restore();
}).on('SIGINT',function(){
  if(!loady.active) process.exit();
})
