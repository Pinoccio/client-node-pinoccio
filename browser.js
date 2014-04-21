var reconnect = require("reconnect-shoe");
var through = require('through');
var browserutil = require('./lib/browserutil');
var apibase = require('./lib/api.js')
var authpop = require("./lib/authpop.js")
var css = require('./lib/css.js');
// created at build time.
var version = require("./_version.js")

module.exports = window.pinoccioAPI = function(opts){

  if(typeof opts === 'string') {
    opts = {token:opts};
  }

  opts = opts||{};
  var api = through();
  var undef;
  api.pending = {};
  api.timeout = 10000;

  api.version = version;

  opts.cookie = opts.cookie||'pinoccio_id';

  api.token = opts.token||browserutil.getCookie(opts.cookie); 
  api.server = opts.server||opts.api||browserutil.findAPIScript()||"https://api.pinocc.io";
  api.account = false;

  var recon = reconnect().connect(api.server+'/shoe');
  var a = apibase(opts,recon);

  api._base = a;

  api.log = function(){
    //console.log.apply(console,arguments);
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
      // allow override token to be specified in options (token managment)
      if(!obj.data.token) obj.data.token = api.token;
    }

    if(!obj.method) obj.method = 'get';
    a.rest(obj,cb);
  };

  // start is optional. you will not get state events for those that have occured before start.
  api.sync = function(options){
    return a.sync(api.token,options);
  };

  // request some or all stats by account.
  // stats are a time series of report data
  // if multiple reports are provided they
  api.stats = function(obj){
    return a.stats(api.token,obj);
  }

  // api.events is depricated. this was very implementation dependent and did not offer predictable or maintainable output streams.
  // it was never documented either.

  // login buttons. protect the users passwords by not having them enter them into your web apps!
  var authButtonStyled = false;
  api.loginButtons = function(perms,cb){
    if(!authButtonStyled){
      authButtonStyled = true;
      css(css.insertStyle().sheet,{
        ".pinoccio-login-button":{
          height:"20px;",
          "font-size":"15px;",
          "border-radius":"4px;",
          "background-color":"#007295;",
          color:"#fff;",
          "text-decoration":"none",
          "font-family":"Arial, Helvetica, sans-serif",
          "display":"inline-block;",
          "padding":"3px 8px 8px 4px;"
        },
        ".pinoccio-login-button:hover":{
          "background-color":"#008CBA"
        },
        ".pinoccio-login-button img":{
          height:"20px;",
          position:"relative;",
          top:"3px;"
        }
      });
    }

    var els = document.getElementsByClassName('pinoccio-login-button');
    for(var i=0;i<els.length;++i){
      if(els[i].pinoccioBound) {
        continue;
      }
      els[i].pinoccioBound = 1;
      els[i].addEventListener('click',function(ev){
        ev.preventDefault();
        api.authorize(perms,cb);
      },false);
      els[i].innerHTML = "<img src='https://api.pinocc.io/static/pinoccio-face.png' alt=''> Login with pinoccio";
    }

    var control = {
      show:function(){
        for(var i=0;i<els.length;++i){
          els[i].style.display = 'inline-block';
        }
      },
      hide:function(){

        for(var i=0;i<els.length;++i){
          els[i].style.display = 'none';
        }
      }
    }
    var origcb = cb;
    cb = function(err,data){
      var ret = origcb(err,data);
      if((ret == undef || ret === true) && !err) control.hide();
    };

    return control;
  }

  api.authorize = function(perms,cb){
    return authpop(api.server,perms,function(err,data){
      if(err) return cb(err);
      api.token = data.token;
      browserutil.setCookie(opts.cookie,api.token);
      // call account serv ice so it calls back with the same value as login.
      api.rest({url:'/v1/account'},function(err,sessionData){
        sessionData.token = api.token;
        sessionData.new = data.new;// is this a brand new token?
        cb(err,sessionData);
      })
    });
  }

  return api;
}

