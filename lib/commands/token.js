
module.exports = function(args,api,config,next){

  if (config.token) {
    console.log(config.token);
    next();
  } else {
    console.log('you are not logged in. you should register or login.');
    next();
  }
}

module.exports.public = true;

module.exports.usage = "token\n"
+"\n "
+"Usage:\n"
+"  pinoccio token"
+"    no arguments.\n"
+"\n"
+"this command prints your current auth token.\n"
+"\n"

