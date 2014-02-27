
var serial = require('../serial');

module.exports = function(args,api,config,cb){

/*
MANUAL PROVISIONING BITLASH COMMANDS

mesh.config(<Scout ID>, <Troop ID>)
mesh.key("<mesh encryption key with max 16 chars>")
scout.sethqtoken("<HQ Token String>")
wifi.config("<Access point name>", "<Access point password>")
wifi.dhcp // if dhcp
wifi.reassociate()
*/

  var ser = serial();
  var devices;
  var troops;  

};

function getTroopsAndDevices(cb){

  var troops
  , devices
  , done = function(err){
    if(err) return cb(err);
    c++;
    if(c == 2) cb(false,troops,devices);
  }
  , c = 0;

  api.rest('get','/v1/troops',function(err,data){
    troops = data;
    done(err);
  });

  ser.list(function(err,data){
    devices = data;
    done(err);
  });

}

module.exports.usage = "provision\n"
+"\n"
+"Usage:\n"
+" pinoccio provision\n"
+"  this command will find scouts connected to your computer via usb/serial and:\n"
+"  - connect with them\n."
+"  - make a troop if you have none.\n"
+"  - and assign them to that troop 
+"  - or ask (if a lead scout) if they would like to create a troop "
+"  - or for any scout to join an existing troop\n"
+"  \n"



