var serialport = require('serialport');

var bindexof = require('buffer-indexof');
var delim = new Buffer("\n");
var thprefix = new Buffer("telehash:");
var prompt = new Buffer("> ");
var telehash = require("telehash");
//telehash.debug(console.log);
var self = telehash.init({id:require("path").resolve("id.json"),seeds:{}},function(err){
  if(err) console.log("telehash init failed",err);
});
var serial;

function die(err)
{
  console.log(err);
  process.exit(1);
}

// we have to write small blocks to not fill up the device buffer
var outQ = [];
var outBusy = false;
function writer(buf)
{
  if(buf) outQ.push(buf);
  if(!outQ.length || outBusy) return;

  // new packet
//  console.log("  42",outQ[0].length);
  serial.write(new Buffer("2a","hex"));

  outBusy = true;
  writeBlock();
}

function writeBlock()
{
  if(!outBusy) return;

  // all done
  if(outQ[0].length == 0)
  {
//    console.log("  done");
    outQ.shift();
    serial.write(new Buffer("00","hex"));
    outBusy = false;
    return writer();
  }

//  console.log("  block",outQ[0].length);
  one = new Buffer(1);
  one[0] = (outQ[0].length > 32)? 32 : outQ[0].length;
  serial.write(one);
  serial.write(outQ[0].slice(0,32));
  outQ[0] = outQ[0].slice(32);
}

function packet2serial(msg)
{
  if(!msg.length) return;
  writer(msg);
}

var dedup = "";
self.deliver("serial",function(to,msg){
  // serial is reliable but slow so ignore identical resent packets
  if(msg.toString() == dedup) return;
  dedup = msg.toString();
  packet2serial(msg);
});

serialport.list(function (err, ports) {
  if(err) return cb(err);
  var com;
  ports.forEach(function(port) {
    if(port.pnpId.indexOf('Pinoccio') > -1 || port.manufacturer.indexOf('Pinoccio') > -1) com = port.comName;
  });
  if(!com) die("no scout found");
  console.log(com);

  serial = new serialport.SerialPort(com, {
    baudrate: 115200,
    buffersize: 16*1024
  });

  serial.on('open',function(err){
    if(err) die(err);
//    process.stdin.pipe(serial);
    // send ping hello
    setTimeout(function(){
      packet2serial(self.pencode(self.ping()));
    },5*1000);
  }).on('error',function(err){
    console.error('serial error: ',err);
  }).on('data',function(buf){
    while(buf.length)
    {
      serialIn(buf.slice(0,1));
      buf = buf.slice(1);
    }
  });
});

function doLine(line)
{
  if(line.length > 1) process.stdout.write(line);
}

function doPacket(raw)
{
  var packet = self.pdecode(raw);
  if(packet)
  {
    self.receive(raw, {type:"serial"});
  }else{
    console.log("packet decode failed?",raw.length,raw.toString("hex"));
  }
}

var bufS = new Buffer(0);
var lenS;
var modeS = 0;
function serialIn(c)
{
  switch(modeS) {
    case 0: // first char on new line
      // detect read packet start
      if(c[0] == 42) return modeS = 2;
      // fall through
      modeS = 1;
    case 1: // normal serial stuff
      if(c[0] == 13) return;
      bufS = Buffer.concat([bufS,c]);
      if(c[0] != 10) return;
      doLine(bufS);
      bufS = new Buffer(0);
      modeS = 0;
      break;
    case 2: // read big len
      lenS = 256 * c[0];
      modeS = 3;
      break;
    case 3: // read little len
      lenS += c[0];
      if(lenS == 0) writeBlock();
      // read packet if any
      modeS = (lenS) ? 4 : 0;
      break;
    case 4: // read packet bytes
      bufS = Buffer.concat([bufS,c]);
      if(bufS.length != lenS) return;
      console.log("  got packet len",lenS,bufS.toString("hex"));
      doPacket(bufS);
      bufS = new Buffer(0);
      modeS = 0;
      break;
  } 
}


