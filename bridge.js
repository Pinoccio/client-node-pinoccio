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

function packet2serial(msg)
{
  if(!msg.length) return;
  var header = new Buffer(3);
  header[0] = 42;
  header[1] = (msg.length-1) / 256;
  header[2] = msg.length - (header[1] * 256);
  console.log("  OUT",header[1],header[2],msg.length,msg.toString("hex"));
  serial.write(Buffer.concat([header,msg]));
}

self.deliver("serial",function(to,msg){
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
    process.stdin.pipe(serial);
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

function doLine()
{
  // line based handling
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
var modeS = 0;
var lenS;
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
      process.stdout.write(c);
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
    case 3: // read big len
      lenS += c[0];
      modeS = 4;
      break;
    case 4: // read packet bytes
      bufS = Buffer.concat([bufS,c]);
      if(bufS.length != lenS) return;
      console.log("  got packet len",lenS,bufS.toString("hex"));
      doPacket(bufS);
      bufS = new Buffer(0);
      modeS = 0;
  } 
}


