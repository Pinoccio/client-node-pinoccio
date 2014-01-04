
var qs = require('querystring');
var path = require('path')
var hyperquest = require('hyperquest');
var xtend = require('xtend');
var concat = require('concat-stream');
var json = require('./lib/json');
var pkg = require('./package.json')


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
    /* 
      im mid refactor on this. 
      rest should not be tangled with serial so i can browserify.

      see lib/serial and lib/bitlassh*

    // put this lead scout in a new troop
    provision:function(com,cb){
      var z = this;
      z.serialConnect(com,function(err,con){
        if(err) return cb("could not open serial connection to "+com);
        // get token
        var done = function(err,data){
          con.close();
          cb(err,data);
        }

        z.rest('post','/account/token',function(err,data){
          if(err) return done(err);
           
        })
      });
    },
    // put this scout in an existing troop.
    associate:function(com,account,troop,cb){
      // get token
      // get mesh id
      // check to see if its already
    },
    */
    rest:function(method,uri,data,cb){

      //console.log('rest',arguments);

      if(typeof data === 'function'){
        cb = data;
        data = {};
      }

      var uri = (config.api||'http://api.pinocc.io:8002')+path.join('/v1',uri);

      var data = data||{};
      if(this.session.token) data.token = this.session.token;


      var opts = {};
      opts.method = (method||"GET").toUpperCase();
      opts.headers = {'x-client-version':pkg.version};

      if(opts.method == 'GET'){
        data = qs.stringify(data);
        uri += '?'+data;
      } else {
        data = JSON.stringify(data);
      }

      if(opts.method != 'GET') {
        opts.headers['content-length'] = data.length;
      }

      var req =  hyperquest(uri,opts,function(err,res){
        res.on('error',function(err){
          cb(err);
          cb = function(){};
        }).pipe(concat(function(data){

          //console.log(data.toString());
          var parsed = json(data)||{};
          cb(parsed.error,parsed.data,data);
        }))
      });

      if(opts.method != 'GET') {
        req.write(data);
        req.end();
      }

    }
  };

  api.session.token = config.token;

  return api;
}

