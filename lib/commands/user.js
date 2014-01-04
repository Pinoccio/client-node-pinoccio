
module.exports = function(args,api,config,next){
  if (api.session && api.session.token) {
    api.rest('get','/account',function(err,data){
      if(err){
        console.log('not logged in, but you used to be.'); 
      } else {
        console.log('you are logged in as ',data.email);
      }
    });
  } else {
    console.log('you are not logged in. you should register or login.');
    next();
  }
}

module.exports.public = true;

module.exports.usage = "user\n"
"\n "
+"Usage:\n"
+" no arguments.\n"
+"\n"
+"this command simply prints who you are if you are logged in.\n"
+"\n"

