
var rpc = require('rpc-stream');
var MDM = require("mux-demux");

module.exports = function(reconnect,connection,options){
  return reconnect(function(s){
    r = makeRpc(stream);
    connection(r);
  }).connect(options);
}

module.exports.rpc = function makeRpc(stream){
  var mdm = MDM({error:true});

  stream.pipe(mdm).on('error',function(e){
    console.log('mdm error',e);
    stream.destroy();
  }).pipe(stream);

  // new connection!
  var r = rpc();

  // add remote rest method.
  var wrap = r.wrap('rest');

  // connect the pipes
  r.pipe(mdm.createStream('rpc')).on('error',function(e){
    e.code = "E_MDM";
    Object.keys(out._pending).forEach(function(k){
      out._pending[k](e);
    });
  }).pipe(r)

  // ALL PENDING CALLBACKS MUST BE CALLED.
  // in the case of error or end. if its pending its an error that it ended.
  var out;
  out = {
    _c:0,
    _pending:{},
    rest:function(){
      var cb = arguments[arguments.length-1];
      if(typeof cb === 'function'){
        var c = ++out._c;
        if(c == 9007199254740992) out._c = 0 //reset if max
        out._pending[c] = arguments[arguments.length-1] = function(){
          delete out._pending[c];
          cb.apply(this,arguments);
        }
      }
      wrap.rest.apply(this,arguments);
    }
  };

  stream.on('error',function(_e){
    mdm.destroy(); 
  });

  stream.on('end',function(){
    var e = new Error('Stream ended before callback was called.');
    e.code = "E_END";

    Object.keys(out._pending).forEach(function(k){
      out._pending[k](e);
    });
  });

  r.on('end',function(){
    console.log('RPC> end');
  }).on('error',function(e){
    console.log('RPC> error',e);
  });

  // expose mdm just in case.
  out.rpc = r;
  out.mdm = mdm;
  out._stream = stream;

  return out;
}



