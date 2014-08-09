var fs = require('fs');
var path = require('path');
var configDir = (process.platform === 'win32') ? process.env.HOMEPATH : process.env.HOME;
if(!configDir) configDir = '.';

var configPath = path.join(configDir,'.pinoccio')
// todo
//var altConfigPath = configDir+'.pinoccio.json'

var config = {};

// ~/pinoccio TODO windows tmppath.
module.exports = function(cb){
  init(function(err,config){
    cb(err,config)
  })
}

module.exports.save = function(cb){

  //console.log('saving',config)

  var cnf = JSON.stringify(config);

  fs.writeFile(configPath,cnf,{flags:'w+'},function(err,bytes){
    if(err) console.log('failed to save config! ',err,config);
    if(cb) cb(err,config);
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
        }
      }
      if(data && data.length) {
        try{
          data = JSON.parse(data);
        } catch(e) {
          return fs.rename(configPath,configPath+'.broken',function(){
            config = {};
            cb(e,config);
          });
        }

        config = data;
      } else {
        config = {};
      }

      cb(false,config);

    })
  })
}
