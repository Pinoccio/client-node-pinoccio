var _config = require('../config')

module.exports = function(args,api,config,cb){

  if(args._.length > 2){
    var key = args._[1]||'';
    var value = args._[2]||false;
    if(key.length && value) {
      config[key] = value
      return _config.save(cb);
    } else if(key.length){
      console.log(config[key]);
    } else {
      console.log('nothing changed.')
    }
    
  } else {
    console.log(config);
  }
  cb();
}

module.exports.public = true;

module.exports.usage = "config\n"
+"\n"
+"Usage:\n"
+"\n"
+"  config key\n"
+"    print the value of the config key\n"
+"  config key value\n"
+"    sets the value of the config key to value\n"
