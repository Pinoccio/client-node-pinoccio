
var serial = require('../serial');

module.exports = function(args,api,config,cb){

/*

Provisioning Commands
> scout.report
> mesh.report
If it's out of date, it gets flashed here. If it's been provisioned before, it gets...

> scout.daisy;scout.daisy
If it's up to date and was never provisioned, was just reset, or was just updated, we wait 5 seconds (to avoid "wifi command run too soon after boot" issues), then...

> wifi.disassociate
> wifi.list
they enter scout/troop name and wifi config info, then...

> hq.settoken("•••")
> mesh.config(1,1,20)
> mesh.key("•••")
> wifi.config("•••","•••")
> wifi.dhcp
> scout.boot

*/

  var ser = serial();
  var devices;
  var troops;  

  getTroopsAndDevices(function(err,troops,devices){
    if(err) {
      console.log('error getting troops and devices')
      return cb('err');
    }

    if(!devices || !devices.length) {
      console.log('could not find any devices');
      return cb();
    }

    // which device?

    ser.conne

  });

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



