var test = require('tape');
var net = require('net');
var connection = require('../lib/connection');

// server side.
var mdm = require('mux-demux');
var rpc = require('rpc-stream');
var through = require('through');


test("can connect",function(t){
  // set to true to drop all output data.
  var stop = false;
  var _con;
  var server = _server(function(con){
    console.log('server connection!')
    _con = con;
    // setup skel server to dumb respond to rest rpc
    var m = mdm(function(stream) {
      console.log('mdm. new stream');      
      if(stream.meta === "rpc"){
        stream.pipe(rpc({
          rest:function(args,cb){
            cb(false,args);
          }
        })).pipe(stream);
      } else {
        console.log('got the stream!');
        _server_side_of_the_stream = stream;
      }
    });

    con.on('error',function(e){

      console.log('S: con error> ',e);

    }).pipe(m).on('error',function(){

      t.fail("S: should not get mdm error");

    }).pipe(through(function(data){
      if(stop) return;
      this.queue(data);
    })).pipe(con);

  },function(err,srv){
    t.ok(!err,'should not have error '+err);
    
    // connect to server addr
    var a = srv.address();
    var s = net.connect(a);

    // add rpc client wrapper 
    var r = connection.rpc(s);
    var metastream = r.mdm.createReadStream('hi');



    metastream.on('error',function(e){
      t.equals(e.code,'E_MDM','should have stream error');
      t.end();
      server.close();
    });

    stop = true;
    setImmediate(function(){
      _con.destroy();
    });
  });
});

function _server(connection,cb){
  var server = net.createServer(function(con){
    connection(con);
  }).listen(0,function(err){
    cb(err,server);
  })
  return server;
}


