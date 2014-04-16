
var qs = require('querystring');
var path = require('path')
var hyperquest = require('hyperquest');
var xtend = require('xtend');
var concat = require('concat-stream');
var json = require('./lib/json');
var pkg = require('./package.json');
var through = require('through');
var repipe = require('repipe');
var split = require('split');

module.exports = function(config){

  var config = config||{};

  // token was passed directly.
  if(typeof config == 'string'){
    config = {token:config};
  }

  var api = {
    session:config.session||{},
    login:function(email,password,cb){
      var z = this;
      z.rest({method:'post',url:'/v1/login',data:{email:email,password:password}},function(err,data){
        if(err) return cb(err);
        z.session = data;
        cb(false,data);
      })
    },
    logout:function(cb){
      if(!this.session.token) return process.nextTick(function(){
        cb(false,false);
      })
      var z = this;
      this.rest({method:'post',url:'/v1/logout'},function(err,data){
        z.session = config.session = {};
        cb(err,data);
      })
    },
    register:function(data,cb){
      var z = this;
      // you should send email,password, firstname, lastname, username
      this.rest({method:'post',url:'/v1/register',data:data},function(err,data){
        if(err) return cb(err);
        z.session = data;
        cb(false,data);
      })
    },
    rest:function(method,uri,data,cb){
      // support the same rest style as browser.
      // opts,cb < i prefer this way
      if(typeof method == 'object' && method){

        cb = uri;
        uri = method.url
        data = method.data
        method = method.method || 'GET'
      }

      //console.log('rest',arguments);

      if(typeof data === 'function'){
        cb = data;
        data = {};
      }

      var uri = (config.api||'https://api.pinocc.io')+path.join('/',''+uri);

      var data = data||{};
      // allow argument supplied token.
      if(!data.token && this.session.token) data.token = this.session.token;

      var opts = {};
      opts.method = (method||"GET").toUpperCase();
      opts.headers = {'x-client-version':pkg.version};

      if(opts.method == 'GET' || opts.method == 'DELETE'){
        data = qs.stringify(data);
        uri += '?'+data;
      } else {
        if(data.token) uri += '?token='+data.token;
        data = JSON.stringify(data);
      }

      if(opts.method != 'GET' && opts.method != 'DELETE') {
        opts.headers['content-length'] = data.length;
      }

      //console.log(uri,opts);

      var req =  hyperquest(uri,opts,function(err,res){
        if(err) {
          return cb(err);
        }

        res.on('error',function(err){
          cb(err);
          cb = function(){};
        })

        if(res.headers['x-stream']) {
          cb(false,res);// return response stream.
        } else {
          res.pipe(concat(function(data){
            //console.log(data.toString());
            var parsed = json(data)||{};
            cb(parsed.error,parsed.data,data);
          }))
        }
      });

      if(opts.method != 'GET' && opts.method != 'DELETE') {
        //console.log(data);
        req.write(data);
        req.end();
      }
    },
    sync:function(opts){
      var s = through(function(data){
        try{
          this.queue(JSON.parse(data));
        } catch(e) {
          this.emit('error',e);
        }
      });
      
      this.rest({url:"/v1/sync",data:opts},function(err,_s){
        if(err) return s.emit('error',err);
        if(!_s) return s.emit('error',new Error('no stream returned'));
        _s.on('error',function(error){
          s.emit('error',error);
        })
        _s.pipe(split()).pipe(s);

        s.on('end',function(){
          _s.socket.end();
        })
      });

      return s;
    },
    stats:function(opts){

      var s = through(function(data){
        try{
          this.queue(JSON.parse(data));
        } catch(e) {
          this.emit('error',e);
        }
      });
 
      this.rest({url:"/v1/stats",data:opts},function(err,_s){
        if(err) return s.emit('error',err);
        if(!_s) return s.emit('error',new Error('no stream returned'));
        _s.on('error',function(error){
          s.emit('error',error);
        })
        _s.pipe(split()),pipe(s);
        s.on('end',function(){
          _s.socket.end();
        })
      })

      return s;
    }
  };

  api.session.token = config.token;

  return api;
}

