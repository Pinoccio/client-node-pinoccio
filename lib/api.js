// retry rpc calls and resume streams and live streams.
// a connection is a function that returns
var through = require('through');
var json = require('./json');
var connection = require('./connection');
var repipe = require('repipe');

module.exports = function(config,reconnect){
  // make sure 
  //var resthttp = rest(config);

  var o = {
    reconnect:reconnect,
    connection:false,
    // make rest like api calls via https or the current streaming connection. 
    restRetries:config.restRetries||2,
    restTimeout:config.restTimeout||30000,// this should not be an issue.
    expectingStream:{},
    rest:function(obj,cb){
      var tries = this.restRetries
      ,z = this;

      var streamKey;
      var timer = setTimeout(function(){
        var e = new Error("call timedout");
        e.code = "E_TIMEOUT";
        _cb(e);
        if(streamKey) delete o.expectingStream[streamKey];
      },z.restTimeout);

      var _cb = function(err,data){

        o.log('rest response> ',err,data)

        if(err && tries > 0) return call();
        if(err) return cb(err);

        if(data.stream){
          // im expecting to follow up with a new stream connection for this callback response.
          z.expectingStream[data.stream] = _cb;
          streamKey = data.stream;
        } else {

          cb(data.error,data.data); 
          clearTimeout(timer);
        }
      };

      function call(){
        --tries;
        getConnection(function(err,con){
          if(err) return _cb(err);
          con.rest(obj,_cb);
        });
      };

      call();
    },
    // sync the account's data in realtime
    sync:function(token,options){
      options = options||{};
      options.token = token;
      var obj = {
        type:"rest"
        ,args:{ 
          url: '/v1/sync',
          data: options,
          method: 'get' 
        }
      };
      var s = through();
      repipe(s,function(err,last,done){
        o.log('repipe got error? ',err,' should i repipe?');
        if(err && err.code != 'E_MDM') return done(err);

        getConnection(function(err,con){
          if(err) return done(err);
          done(false,con.mdm.createReadStream(obj));
        });
      });
      s.on('data',function(d){
        // on reconnect start sync from where i left off.
        obj.args.data.start = d.time;
      })
      return s;
    },
    // stream stats data
    stats:function(token,o){
      /*
        o.troop
        o.scout
        o.reports = [led,..]
        o.start = now
        o.end = then
        o.tail defaults true with no end
      */

      o.token = token;

      var obj = {
        type:"rest"
        ,args:{ 
          url: '/v1/stats',
          data: o,
          method: 'get' 
        }
      };
      var s = through();
      repipe(s,function(err,last,done){
        if(err && err.code != 'E_MDM') return done(err);

        if(last) o.start = last.key;
        getConnection(function(err,con){
          if(err) return done(err);
          done(false,con.mdm.createReadStream(obj));
        });
      });

      return s; // resume!
    },
    events:function(){
      var s = through();
      repipe(s,function(err,last,done){
        if(err && err.code != 'E_MDM') return done(err);

        if(last) o.start = last.key;
        getConnection(function(err,con){
          if(err) return done(err);
          done(false,con.mdm.createReadStream({type:"events"}));
        });
      });

      return s.pipe(through(function(data){
        data = json(data);
        if(data) this.queue(data);
      }));
    },
    log:function(){
      // no op. 
    }
  };

  var pending = [];

  function getConnection(cb){
    if(reconnect && !reconnect._bound) {
      reconnect._bound = 1;
      if(reconnect.connected) o.connection = connection.rpc(reconnect._connection); 
      reconnect.on('connect',function(s){
        o.connection = connection.rpc(s);

        o.log('bound connection listener!');
        o.connection.mdm.on('connection',function(stream){
          o.log('mdm got stream from connection listener',stream.meta);
          // the server has opened a stream from me.
          if(stream.meta && stream.meta.type == "rest-stream") {
            if(o.expectingStream[stream.meta.id]) {
              o.expectingStream[stream.meta.id](false,{data:stream});
              delete o.expectingStream[stream.meta.id];
            }
          };
        });

        while(pending.length) pending.shift()(false,o.connection);
      }).on('disconnect',function(){
        o.connection = false;
        Object.keys(o.expectingStream).forEach(function(k){
          var e = new Error('disconnect before start');
          e.code = "E_DISCONNECT";
          o.expectingStream[k](e);
          delete o.expectingStream[k];
        });
      })
    }

    if(reconnect.reconnect == false && !reconnect.connection) {
      return process.nextTick(function(){
        var e = new Error('reconnect is off. no new conections will be made.');
        e.code = "E_RECONOFF";
        cb(e);
      });
    }

    if(o.connection) return process.nextTick(function(){
      if(o.connection) cb(false,o.connection);
      else pending.push(cb);
    });

    pending.push(cb);
  }

  return o;  

}

/*
    // obj must have url and method.
    // obj may have data

    api.log('rest>',obj,api.token);

    if(api.token){
      if(!obj.data) obj.data = {};
      obj.data.token = api.token;
    }

    if(!obj.method) obj.method = 'get';

    var id = obj.id = ++this.id;
    api.pending[id] = cb||function(){};
    setTimeout(function(){
      if(api.pending[id]) {
        delete api.pending[id];
        cb(new Error('timeout'));
      }
    },api.timeout);

    getStream(function(err,stream){
      stream.write(JSON.stringify(obj));
    });
*/


