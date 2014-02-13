var hyperquest = require('hyperquest');
var concats = require('concat-stream');
var pkg = require('../package.json');

// http requests for those times when you are not streaming. 
// its weird right? not streaming.. 

module.exports = function(config) {
  return function(method,uri,data,cb){

    if(typeof data === 'function'){
      cb = data;
      data = {};
    }

    var uri = (config.api||'https://api.pinocc.io')+path.join('/v1',''+uri);

    // token must be added above here.

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

    var req =  hyperquest(uri,opts,function(err,res){
      if(err) return cb(err);
      res.on('error',function(err){
        cb(err);
        cb = function(){};
      }).pipe(concats(function(data){
        var parsed = json(data)||{};
        cb(false,parsed,data);
      }))
    });

    if(opts.method != 'GET') {
      req.write(data);
      req.end();
    }

  }
};


