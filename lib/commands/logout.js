
module.exports = function(args,api,config,cb){

  api.logout(cb);

}

module.exports.usage = "logout\n"
+"\n"
+"Usage:\n"
+" pinoccio logout\n"
+"\n"
+" logout your current saved session token.\n"
+" to logout an other token use: \n"
+"   pinoccio rest post v1/logout?token=<the other token>\n"

