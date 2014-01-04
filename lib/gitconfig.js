var fs = require('fs');
var ini = require('ini');

module.exports = function(cb){
  var path = process.env.HOME+'/.gitconfig';
  fs.exists(path,function(exists){
    if(!exists) return false;

    fs.readFile(path,function(err,buf){
      try{
        cb(false,ini.decode(buf+''));
      } catch (e) {
        return cb(e);
      }
    });
  })
}


