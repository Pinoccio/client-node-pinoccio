var reconnect = require("reconnect/engine.io");
var engineOptions = require('engine.io-options-from-url');

var browserutil = require('./lib/browserutil');

var api = require('./lib/api.js')

module.exports = window.pinoccioAPI = function(opts){

  var recon = reconnect().connect(engineOptions(opts.api||browserutil.findApiScript()||"https://api.pinocc.io"));
  var a = api(opts,recon);

  a.login(email,pass,function(err,account){

    a.rest('get','/troops',function(){

      var stream = a.sync();

    })

  })

}

