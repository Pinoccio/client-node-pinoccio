
var qs = require('querystring');
var path = require('path')
var hyperquest = require('hyperquest');
var xtend = require('xtend');
var concat = require('concat-stream');
var json = require('./lib/json');
var pkg = require('./package.json')


var apibase = require('./lib/api');


module.exports = function(config){

  var config = config||{};

  var api = {
    session:config.session||{},
    login:function(email,password,cb){
      this.rest('post','/login',{email:email,password:password},function(err,data){
        if(err) return cb(err);
        this.session = data;
        cb(false,data);
      })
    },
    logout:function(cb){
      if(!this.session.token) return process.nextTick(function(){
        cb(false,false);
      })

      this.rest('post','/logout',function(err,data){
        this.session = config.session = {};
        cb(err,data);
      })
    },
    register:function(data,cb){
      // you should send email,password, firstname, lastname, username
      this.rest('post','/register',data,function(err,data){
        if(err) return cb(err);
        this.session = data;
        cb(false,data);
      })
    },
    rest:function(method,uri,data,cb){

      //console.log('rest',arguments);

      if(typeof data === 'function'){
        cb = data;
        data = {};
      }

      var uri = (config.api||'https://api.pinocc.io')+path.join('/v1',''+uri);

      var data = data||{};
      if(this.session.token) data.token = this.session.token;

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

      if(opts.method != 'GET' && opts.methos != 'DELETE') {
        opts.headers['content-length'] = data.length;
      }

      //console.log(uri,opts);

      var req =  hyperquest(uri,opts,function(err,res){
        if(err) return cb(err);


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

      if(opts.method != 'GET') {
        //console.log(data);
        req.write(data);
        req.end();
      }

    }
  };

  api.session.token = config.token;

  return api;
}

