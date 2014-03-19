
var interactive = require('../interactive');
var serial = require('../serial');
var scoutparse = require('../scoutparse');
var loady = require('../loady');

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
  var state = {};

  getTroopsAndDevices(api,ser,function(err,troops,devices){
    if(err) {
      console.log('error getting troops and devices.')
      return cb(err);
    }

    if(!devices || !devices.length) {
      console.log('could not find any pinoccio\'s plugged in. check that the usb is plugged in and the scout is turned on.');
      return cb();
    }

    getDevice(function(err,device){
      if(err) {
        console.log(err);
        process.exit();
      }

      deviceState(device,function(err,state,serial){

        //console.log('device state? ',err,state);
       
        if(state.lead === undefined) {
          console.log('I couldn\'t determine if the plugged in scout was a lead. It might not be responding to commands.\nplease turn it off and on then try again.')
          process.exit();
        }

        /*
        { troops: 
           [ { account: 19,
               token: 'af49e76320781a7b9722a137039b7f99',
               id: '1',
               troop: '1',
               online: true } ],
          devices: [ '/dev/ttyACM0' ],
          lead: true,
          hqtoken: 'af49e76320781a7b9722a137039b7f99',
          mesh: 
           { type: 'mesh',
             scoutid: 1,
             troopid: 1,
             routes: 0,
             channel: 20,
             rate: '250 kb/s',
             power: '3.5 dBm' },
          accessPoint: { ssid: 'rebelious bluejay', password: 'blacksheepwall' },
          accessPoints: 
           { 'rebelious bluejay': 
              { bssid: '14:7d:c5:20:66:c8',
                ssid: 'rebelious bluejay',
                channel: '06',
                type: 'INFRA',
                rssi: '-46',
                security: 'WPA2-PERSONAL' } } }v
        */

        var qs = [];
        var promptAlreadyProvisioned = false;
        // first check to see if this scout is already provisioned to this account.
        var tokens = {};
        if(state.troops && state.troops.length) {
          state.troops.forEach(function(t,i){
            tokens[t.token] = i;
            if(state.hqtoken) {
              if(state.hqtoken === t.token) {
                promptAlreadyProvisioned = t;
              }
            }
          })
        }

        if(promptAlreadyProvisioned) {
          var name = promptAlreadyProvisioned.name;
          qs.push({
            key:"reprovision",
            question:"this scout is already a member of troop "+(name?name+' ('+promptAlreadyProvisioned.id+')':promptAlreadyProvisioned.id)+". If you continue this scout will be reset.\npress y to continue, or anything else to cancel: ",
            cb:function(input,next){
              if(input && input.trim().toLowerCase() !== 'y') {
                console.log('Canceling.');
                process.exit();
              }
              next(input);
            }
          })
        }

        // i have no troops at all.
        // i have a single troop
        // i have many troops

        var resultData = {};

        function getTroopAndScout(cb){
          if(state.troops.length == 0){
            
          }
          if(state.lead) {
            //"would you like to make a new troop?"
            // api call.
            // get token.
            interactive([{
              key:"newtroop",
              question:"would you like to make a new troop? (y/n)",
              cb:function(input,next){
                next(input.trim());
              }
            }],function(err,data){
              if(data.newtroop.toLowerCase() == 'n') {
                console.log('you are the boss but weird things will happen if you add multiple lead scouts to the same troop at this time.');
                troopmenu(function(){

                })
              }
            })

          } else {
            interactive([{
              key:"token",
              question:"which troop would you like to add the scout too?: ",
              cb:function(input,next){
                next(input.trim());
              }
            }],function(err,data){

            })
          }
        
        }

        function troopmenu(){
          if(state.troops.length === 1){
            //
          }
        }

        function newTroop(){
          var qs = [
            {
              key:"name",
              question:"Troop Name:"
            },
            {
              key:"scoutName",
              question:"Scout Name:"
            },
            {
              key:"ssid",
              question:"Wifi Network:"
            },
            {
              key:"password",
              question:"Wifi Password:"
            }
          ];


          interactive(qs,function(err,data){
            // configure wifi.
            api.rest({method:"post",url:'/v1/troop',data:{name:data.name,scoutName:data.scoutName}},function(err,data){
              if(err) {
                console.log('error creating troop!',err);
                process.exit();
              }



            })
          })
        }

        function startQuestions(){
          interactive(qs,function(err,data){
            console.log('ok provision now?',err,data);
            
          });
        }
        // ASK QUESTIONS HERE
        //console.log('TODO! ask questions!');
        //process.exit(); 

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
        if(err) {
          console.log('serial connection failed ',err);
          console.log('please try to unplug and replug the scout.')
          process.exit();
        }

        console.log('connected!');
        
        var loadend;
        var c = 0, done = function(e){

          if(e || !--c) {
            if(loadend) {
              loadend();
              process.removeListener('SIGINT',onINT);
            }
            cb(e,state,bl);
          }
        };
        var onINT = function(){
          loadend();
          c = 1;
          done();
        }
        ++c;
        
        bl.command('scout.isleadscout',function(err,res){
          if(err) return done(err);

          res = (res||'').trim()
          if(!res.length || isNaN(parseInt(res,10))) {
            return done('could not determine if the scout is a lead.');
          }

          state.lead = parseInt(res,10)?true:false;

          if(state.lead) {
            // get wifi config from lead scout.
            
            ++c;
            console.log('found lead scout. scanning wifi.. CTRL+C to skip');
            loadend = loady();
            process.on('SIGINT',onINT);

            setTimeout(function(){
              wifiList(bl,function(err,res){
                if(res) state.accessPoints = scoutparse['wifi.list'](res);
                done(err);
              });


              ++c;
              bl.command('wifi.command("AT&V")',function(err,data){

                if(err) return done("failed to get wifi config. "+err);

                data = scoutparse['AT&V'](data);  
                if(data.WAUTO){
                  var ssid = data.WAUTO.split(',')[1];
                  if(ssid) {
                    ssid = ssid.replace(/^"|"$/g,'');
                    state.accessPoint = {ssid:ssid};
                    if(data.WWPA) {
                      state.accessPoint.password = data.WWPA;
                    }
                  }
                }
                done();
              });


            },5000);// allow time for the wifi module to get started.
          }

          done();

        });
        ++c;
        bl.command('scout.gethqtoken',function(err,res){
          if(res) state.hqtoken = res.trim();
          done();
        });

        ++c;
        bl.command('mesh.report',function(err,res){
          if(res) {
            try{
              state.mesh = JSON.parse(res);
            } catch (e){
              console.log('\binvalid json in mesh report.');
            }
          }
          done();
        });

        // is lead scout
        // troop

      });

    }

    function wifiList(bl,cb){
      var tries = 0;
      function run(){
        bl.command('wifi.list',function(err,res){
          if(err) return cb(err);
          if(res.trim() === 'Error: Scan failed') {

            console.log('\b=( wifi scan failed.');
            if(++tries < 3) {
              console.log('\bretrying.');
              setTimeout(function(){
                run();
              },1000);
              return;
            }
            return cb(res);
          }

          cb(err,res);
        });
      }
      
      setTimeout(function(){run()},2000);
    }

    state.troops = troops;
    state.devices = devices;
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



