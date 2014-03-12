
var interactive = require('../interactive');
var serial = require('../serial');
var scoutparse = require('../scoutparse');

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

  getTroopsAndDevices(api,ser,function(err,troops,devices){
    if(err) {
      console.log('error getting troops and devices.')
      return cb(err);
    }

    if(!devices || !devices.length) {
      console.log('could not find any pinoccio\'s plugged in. check that the usb is plugged in and the scout is turned on.');
      return cb();
    }

    getDevice(function(error,device){
      if(err) {
        return console.log(err);
      }

      deviceState(device,function(err,state,serial){

        console.log('device state? ',err,state,serial);
        console.log('moar!---');

      })
    });


    function getDevice(cb){

      if(devices.length === 1) {
        console.log('found scout attached on ',devices[0]);
        return cb(false,devices[0]);
      }

      var menu = "";
      devices.forEach(function(d,i){
        menu += "  "+i+") "+d+"\n"
      });

      interactive([
        {
          key:"device",
          question:"which scout would you like to provision?\n"+menu+"\nnumber or device name: ",
          cb:function(input,next){
            next(input.trim());
          }
        }
      ],function(err,data){
          if(devices[data.device]){
            cb(false,devices[data.device]);
          } else if(devices.indexOf(data.device) === 0){
            cb(false,data.device);
          } else {
            cb("could not find scout with device id "+data.device);
          }
      });

    }

    function deviceState(device,cb){

      console.log("connecting to ",device,"...");
      // which device?
      ser.connect(device,function(err,bl){
        if(err) return console.log('serial conneciton failed ',err);
        console.log('connected!');
        

        var state = {};
        var err;
        var c = 2, done = function(){
          if(err || !--c) cb(err,state,bl);
        };

        bl.command('scout.isleadscout',function(err,res){
          state.lead = +res?true:false;

          if(state.lead) {
            // get wifi config from lead scout.
            
            ++c;
            console.log('checking lead scout.')
            setTimeout(function(){
              bl.command('wifi.command("AT&V")',function(err,data){
                if(err) return done("failed to get wifi config. "+err);
                data = scoutparse['AT&V'](data);  
                if(data.WAUTO){
                  var ap = data.WAUTO.split(',')[1];
                  if(ap) {
                    ap = ap.replace(/^"|"$/g);
                    state.accessPoint = ap;
                  }
                }
                done();
              });

              //++c;
              //bl.command('wifi.list',function(err,res){
                
              //})

            },5000);
            return;
          }

          done(err);

        });

        bl.command('')
        // is lead scout
        // troop

      });

    }
 
    console.log('troops',troops,'devices',devices);
  });

};

function getTroopsAndDevices(api,ser,cb){

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
+"  - and assign them to that troop" 
+"  - or ask (if a lead scout) if they would like to create a troop "
+"  - or for any scout to join an existing troop\n"
+"  \n"



