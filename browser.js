var reconnect = require("reconnect-shoe");
var through = require('through');
var browserutil = require('./lib/browserutil');
var apibase = require('./lib/api.js')

module.exports = window.pinoccioAPI = function(opts){

  opts = opts||{};
  var api = through();
  var undef;
  api.pending = {};
  api.id = 0;
  api.timeout = 10000;

  opts.cookie = opts.cookie||'pinoccio_id';

  api.token = browserutil.getCookie(opts.cookie); 
  api.server = opts.server||opts.api||browserutil.findAPIScript()||"https://api.pinocc.io";
  api.account = false;


  var recon = reconnect().connect(api.server+'/shoe');//engineOptions(api.server+'/engine'));
  var a = apibase(opts,recon);

  api.log = function(){
    console.log.apply(console,arguments);
  };

  api.login = function(email,pass,cb){
    api.rest({url:"/v1/login",method:"post",data:{email:email,password:pass}},function(err,data){
      // todo untrusted host login/reg
      if(err) return cb(err);
      api.account = data.account;
      api.token = data.token;
      browserutil.setCookie(opts.cookie,api.token);
      cb(false,data);
    })
  };

  api.register = function(data,cb){
    api.rest({url:"/v1/register",method:"post",data:data},function(err,data){
      // todo untrusted host login/reg
      if(err) return cb(err);
      api.account = data.account;
      api.token = data.token;
      browserutil.setCookie(opts.cookie,api.token);
      cb(false,data);
    });
  };

  api.logout = function(cb){
    // todo make sure api server clears troop watchers etc. in socket state. the api should not need to think about this.
    api.rest({url:'/v1/logout',method:'post'},function(err,data){
      //api.token = undef;
      api.account = undef;
      //clearCookie(opts.cookie);
      cb(err,data);
    });
  };

  api.rest = function(obj,cb){
    // obj must have url and method.
    // obj may have data

    api.log('rest>',obj,api.token);

    if(api.token){
      if(!obj.data) obj.data = {};
      obj.data.token = api.token;
    }

    if(!obj.method) obj.method = 'get';
    a.rest(obj,cb);
  };

  // start is optional. you will not get state events for those that have occured before start.
  api.sync = function(start){
    return a.sync(api.token,start);
  };

  // request some or all stats by account.
  // stats are a time series of report data
  // if multiple reports are provided they
  api.stats = function(obj){
    //
    return a.stats(api.token,obj);
  }

  // get the raw events stream.
  // to subscribe to a troops raw events you must either execute a command on a scout in that troop or watch the troop
  // api.rest({url:"/v1/{troopid}",method:"watch"},console.log.bind(console))
  api.events = function(){
    //
    return a.events(api.token);
  }

  return api;
}

