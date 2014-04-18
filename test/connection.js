var test = require('tape');
var net = require('net');
var connection = require('../lib/connection');
var mdm = require('mux-demux');
var rpc = require('rpc-stream');
var reconnect = require('reconnect-core');
var through = require('through');


test("can connect",function(t){
  
  var server = _server(function(con){

    // setup skel server to dumb respond to rest rpc
    var m = mdm(function(stream){
      console.log('stream!',stream.meta);
      if(stream.meta === "rpc"){
        stream.pipe(rpc({
          rest:function(args,cb){
            cb(false,args);
          }
        })).pipe(stream);
      }   
    });

    con.pipe(m).on('error',function(){
      t.fail("should not get mdm error");
    }).pipe(con);

  },function(err,srv){
    t.ok(!err,'should not have error '+err);
    
    // connect to server addr
    var a = srv.address();
    var s = net.connect(a);

    // add rpc client wrapper 
    var r = connection.rpc(s);

    // test exposed rest method.
    r.rest('hihi','hoho',function(err,result){

      console.log('rest called back.',err,result);

      t.ok(!err,'should have no error calling rest.');
      t.equals(result[0],'hihi',"should have correct result");

      // done.
      t.end();
      // cleanup net cons.
      server.close();
      s.end();
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


