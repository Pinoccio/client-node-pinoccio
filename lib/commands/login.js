
var interactive = require('../interactive');
var stringy = require('../stringy');
var gitconfig = require('../gitconfig');

module.exports = function(args,api,config,cb){
  var email = stringy(args.e||args.email||args.u||args.user||args.username||args._[1]);
  var password = stringy(args.p|| args.pass||args.password||args._[2]);

  var auth = function (){
    api.login(email,password,function(err,data){
      if(err) return cb(err.message);
      cb(false,data);
    })
  };

  if(!email || !password){

    if(args['stop-it'] || args['non-interactive']) {
      console.log(module.exports.usage);
      return cb()
    }

    var ask = [];
    if(!email) ask.push(module.exports.questions.email); 
    if(!password) ask.push(module.exports.questions.password);

    gitconfig(function(err,config){

      var defaultEmail = false;
      if(config && config.user) {
        if(!email && config.user.email) {
          defaultEmail = config.user.email
          module.exports.questions.email.question = "email ("+defaultEmail+"): "
        }
      }

      interactive(ask,function(err,data){
        if(err) throw err;
        if(data.email) email = data.email;
        if(data.password) password = data.password;

        if(!email && defaultEmail) {
          email = defaultEmail;
        }

        auth();     
      });
    });

  } else {
    auth();
  }
}

module.exports.public = true;

module.exports.questions = {
  "email":{
    key:"email",
    question:"email: ",
    cb:function(input,next){
      next(input)
    }
  },
  "password":{
    key:"password",
    question:"password: ",
    cb:function(input,next){
      next(input)
    },
    password:1
  }
};

module.exports.usage = "login\n"
+"\n"
+"Usage: \n"
+"\n"
+"  pinoccio login -e email@pinocc.io -p mypassword\n"
+"    -e --email\n"
+"    -p --password\n"
+"\n"
+" or it may be used with no flags\n"
+"  pinoccio login email@pinocc.io mypassword\n"
+"\n"
+"if you omit one or both options you will be promted interactively.\n"
+"To turn off interactive use flag --stop-it\n"
+"\n"
;

