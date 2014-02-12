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
    _con = con;
    // setup skel server to dumb respond to rest rpc
    var m = mdm(function(stream){
      if(stream.meta === "rpc"){
        stream.pipe(rpc({
          rest:function(args,cb){
            cb(false,args);
          }
        })).pipe(stream);
      }   
    });

    con.on('error',function(e){
      console.log('con error> ',e);
    }).pipe(m).on('error',function(){
      t.fail("should not get mdm error");
    }).pipe(through(function(data){
      if(stop) return;
      this.queue(data);
    })).pipe(con);

    next.go();

  },function(err,srv){
    t.ok(!err,'should not have error '+err);
    
    // connect to server addr
    var a = srv.address();
    var s = net.connect(a);

    // add rpc client wrapper 
    var r = connection.rpc(s);

    r.rest('hi',function(err,result){

      console.log('rest called back.',err,result);

      t.equals(err.code,"E_MDM",'should have stream error calling rest.');

      // done.
      t.end();
      // cleanup net cons.
      server.close();
    });

    stop = true;
    next(function(){
      _con.destroy();
    });
  });
});

var q = [];
function next(cb){
  q.push(cb);
}
next.go = function(){
 q.shift()(); 
}

function _server(connection,cb){
  var server = net.createServer(function(con){
    connection(con);
  }).listen(0,function(err){
    cb(err,server);
  })
  return server;
}


