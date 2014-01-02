var fs = require('fs')
var configDir = '/home/'+process.env.USER;
var configPath = configDir+'/.pinoccio'

var config = {};

// ~/pinoccio TODO windows tmppath.
module.exports = function(cb){
  init(function(err,config){
    cb(err,config)
  })
}

module.exports.save = function(cb){
  fs.writeFile(configPath,JSON.stringify(config),function(err){
    cb(err,config);
  })
}



function init(cb){
  fs.exists(configDir,function(exists){
    if(!exists) {
      configDir = false;
      config = {};
      return cb(false,config);
    }

    fs.readFile(configPath,function(err,data){
      if(err) {
        if(err.code !== 'ENOENT') {
          return cb(err);
        } else {
          return cb(false,config)
        }
      }
      try{
        data = JSON.parse(data);
      } catch(e) {
        return fs.rename(configPath,configPath+'.broken',function(){
          config = {};
          cb(e,config);
        });
      }

      config = data;
      cb(false,data);

    })
  })
}
