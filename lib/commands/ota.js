var serial = require('pinoccio-serial');
var intel_hex = require('intel-hex');
var fs = require('fs');
var rl = require('../rl');

// How much data to send through serial each time
// Must be a multiple of the page size (256). Due to limits in the
// bitlash stack size, this cannot be more than 256 currently.
var block_size = 256;

module.exports = function(args,api,config,cb){
  var target;
  if (args.target) {
    if (!(args.target >= 0 && args.target < 0xffff))
      return cb("Target must be a short id between 0 and 0xfffe");
  } else if (args.broadcast){
    args.target = 0xffff;
  } else if (config['ota.default-target']) {
    args.target = config['ota.default-target'];
    if (args.ide) {
      console.log("Using default target id " + args.target + ". To change it, run");
      console.log("\"pinoccio config ota.default-target <id>\"");
      console.log();
    }
  } else {
    if (args.ide)
      return cb('No default target was configured. Run "pinoccio config ota.default-target <id>" manually to set it.');
    else
      return cb('Must specify either --target, --broadcast or set the ota.default-target config value');
  }

  if (args.reboot) {
    if (args.target == 0xffff)
      return cb('--reboot needs --target');
  }

  if (args.hex) {
    fs.readFile(args.hex, function(err, data) {
      if (err) {
        console.error("Failed to read " + args.hex + ": " + err);
        process.exit();
      } else {
        var binary;
        try {
          binary = intel_hex.parse(data).data;
        } catch (e) {
          return cb('Invalid hex file supplied: ' + e);
        }
        otaflash(args, binary);
      }
    });
  } else if (args.clone) {
    otaflash(args, null);
  } else {
    return cb('Must specify either --hex or --clone');
  }
}

function otaflash(args, binary) {
  var o = serial();
  o.list(function(err,data,ports){

    var device = null;
    if(args.device) device = args.device;
    else if(args.d) device = args.device;
    else if(data.length == 1) device = data[0]; // default to the one and only

    if (args.ide) {
      console.log("Connecting to scout at " + device + ". This scout will");
      if (args.reboot) {
        console.log("first send a \"scout.otaboot\" to the target and then");
      }
      if (args.clone) {
        console.log("copy its own flash memory to the target Scout through radio.");
      } else {
        console.log("send over the the program to the target Scout through radio.");
      }
      if (args.broadcast) {
        console.log("The target scout must already in OTA mode. If multiple scouts");
        console.log("are in OTA mode, the first one to respond to an OTA ping");
        console.log("command is used as the target.");
      } else {
        console.log("The target scout is the one with ID " + args.target + ".");
      }
      console.log();
    }

    var verbose = 0;
    if (args.verbose) verbose += args.verbose;
    else if (args.v) verbose += args.v;

    if(device) {
      if(data.indexOf(device) < 0) {
         console.log('device ',args.d,'may not be a pinoccio or connected. ill try and connect anyway.');
      }

      o.connect(device,function(err,bl){
        if(err) throw err;

        // Should normal (non-error) output be hidden?
        var hide_output = (verbose < 1);
        var last_cmd = "";

        // pass through all serial output data to terminal.
        //
        bl.on('line',function(data){
          if (hide_output) {
            var str = String(data).trim()
            if (str == last_cmd || str == "OK" || str == ">" || str == "")
              return;
          }
          process.stdout.write(data);
        })

        function ota_command(cmd, data, next) {
          var to = setTimeout(function() {
            console.log("No response received from Scout. Did you select the right port?");
            process.exit(1);
          }, 5000);

          function line(data) {
            d = String(data).trim();
            if (d == 'OK') {
              bl.removeListener('line',line);
              clearTimeout(to);
              next();
            } else if (d == 'FAIL') {
              console.log("Failed")
              process.exit(1);
            }
          }

          bl.on('line',line);
          last_cmd = cmd;
          if (data)
            cmd += "\r\n\0" + data;
          bl.command(cmd, function(err,data) {});
        }

        bl.command('module.enable("ota")', function(err, data) {});
        if (args.reboot)
          bl.command('command.scout(' + args.target + ', "scout.otaboot")', function(err, data) {});

        // Wait a bit for the bootloader to set up for when using --reboot
        setTimeout(send_start, 1500);

        function send_start() {
          ota_command('ota.start(' + args.target + ',' + (args.dryrun ? '1' : '0') + ')', null, send_data);
        }

        function send_data() {
          if (binary)
            send_block(0);
          else
            ota_command('ota.clone', null, send_end);
        }

        function send_block(addr) {
          size = Math.min(block_size, binary.length - addr);
          if (size > 0) {
            if (!hide_output) {
              hide_output = (verbose < 2);
              if (hide_output)
                console.log("Not displaying ota.block commands, pass --verbose 2 to show them");
            }
            data = binary.slice(addr, addr + size);
            //ota_command('ota.block(0, ' + size + ')', data, function() { send_end(addr + size); });
            ota_command('ota.block(' + addr + ', "' + data.toString('hex') + '")', null, function() { send_block(addr + size); });
          } else {
            hide_output = (verbose < 1);
            send_end();
          }
        }

        function send_end() {
          ota_command('ota.end', null, function() { console.log("Done"); process.exit(0); });
        }

      });
    } else {
      if(data.length) process.stdout.write('"'+data.join('" "')+'"\n');
      else console.error('no pinoccios found on ports '+ports.map(function(port){return port.comName}).join(" "));
    }
  })
}


module.exports.public = true;

module.exports.usage = "ota\n"
+"\n"
+"  Do an over-the-air flash of a scout. This needs one scout attached\n"
+"  to serial used to send the data to the target scout (needs to be in\n"
+"  direct range, mesh routing not yet supported).\n"
+"\n "
+"Usage:\n"
+"  pinoccio ota\n"
+"  pinoccio serial [options]\n"
+"    -d <port>, --device <port>     serial port to use (optional when just one pinoccio is connected\n"
+"    --target <n>                   id of the target scout to flash\n"
+"    --broadcast                    flash the first scout to respond to a broadcast ping (must be in ota mode already)\n"
+"    --reboot                       send a scout.otaboot command to reboot the scout into ota mode\n"
+"    --dryrun                       tell the bootloader to do everything but the actual flash\n"
+"    --hex <file>                   hex file to flash\n"
+"    --clone                        clone the serial-connected scout's flash to the target\n"
+"    -v <level>, --verbose <level>  enable verbose mode. If level is left out, it defaults to 1\n"
+"    --ide                          passed when called from the Arduino IDE, to emit more appropriate messages\n"
+"When neither --target or --broadcast is given, the value of the ota.default-target config value\n"
+"is used to select the target. To set it, run e.g. \"ota config ota.default-target 123\".\n"
+"\n"
