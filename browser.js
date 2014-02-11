var engine = require("reconnect/engine.io");
var engineOptions = require('engine.io-options-from-url');
var connect = require('./lib/connect.js');
var browserutil = require('./lib/browserutil');


module.exports = window.pinoccioAPI = function(opts){
  
  var recon = connect(engine,function(stream){

  },engineOptions(opts.api||browserutil.findApiScript()||"https://api.pinocc.io"))
}

