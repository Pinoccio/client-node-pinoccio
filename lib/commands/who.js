
module.exports = function(args,api,config,next){
  if (config.token) {
    api.rest('get','/v1/account',function(err,data){
      if(err){
        console.log('not logged in, but you used to be.'); 
      } else {
        console.log('you are logged in as',data?data.email:data);
      }
      next();
    });
  } else {
    console.log('you are not logged in. you should register or login.');
    next();
  }
}

module.exports.public = true;

module.exports.usage = "who\n"
+"\n "
+"Usage:\n"
+"  pinoccio who"
+"    no arguments.\n"
+"\n"
+"this command prints who you are if you are logged in.\n"
+"\n"

