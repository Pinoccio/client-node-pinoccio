
var interactive = require('../interactive');
var gitconfig = require('../gitconfig');

module.exports = function(args,api,config,cb){
  var name = args.n||args.name;
  var email = args.e||args.email;
  var password = args.p||args.pass||args.password;
  var agree = args.a||args.agree;

  var auth = function(data){
    api.register(data,function(err,data){
      if(err) return cb(err.message);
      cb(false,data);
      console.log('OK');
    })
  };

  if(!email || !password){

    if(args['stop-it'] || args['non-interactive']) {
      console.log(module.exports.usage);
      return cb()
    }

    var ask = [];

    if(!name) ask.push(module.exports.questions.name); 
    if(!email) ask.push(module.exports.questions.email); 
    if(!password) ask.push(module.exports.questions.password);
    if(!agree) ask.push(module.exports.questions.agreed_to_tc);

    gitconfig(function(err,config){

      var defaultEmail = false;
      var defaultName = false;

      if(config && config.user) {
        if(!name && config.user.name) {
          defaultName = config.user.name
          module.exports.questions.name.question = "name ("+defaultName+"): "
        }
        if(!email && config.user.email) {
          defaultEmail = config.user.email
          module.exports.questions.email.question = "email ("+defaultEmail+"): "
        }
      }

      interactive(ask,function(err,data){
        if(err) throw err;

        if(data.name) {
          name = data.name;
          var parts = data.name.split(/\s+/);
          data.first_name = parts[0];
          if(parts.length > 1) data.last_name = parts[parts.length-1];
        }

        if(email) data.email = email;
        if(password) data.password = password;

        if(!data.email && defaultEmail) {
          data.email = defaultEmail;
        }

        if(!name && defaultName) {
          email = defaultName;
        }


        auth(data); 
      });
    });
  } else {
    var data = parseName(name);
    data.email = email;
    data.password = password;
    auth(data);
  }

}

module.exports.public = true;

module.exports.questions = {
  "name":{
    key:"name",
    question:"name: ",
    cb:function(input,next){
      next(input.trim())
    }
  },
  "email":{
    key:"email",
    question:"email: ",
    cb:function(input,next){
      next(input.trim())
    }
  },
  "password":{
    key:"password",
    question:"password: ",
    password:true,
    cb:function(input,next){
      next(input.trim())
    }
  },
  "agreed_to_tc":{
    key:"agreed_to_tc",
    question:"agree to the terms and privacy policy? https://pinocc.io/terms and https://pinocc.io/privacy \n(y/n):",
    cb:function(input,next){
      input = (input||'').trim().toLowerCase();
      if(input === "y") {
        next(1);
      } else {
        if(input !== 'n') console.log('please enter y for yes or n for no');
        else console.log('aww man but we are super nice people!')
        process.exit();
      }
    }
  }
};

module.exports.usage = "register\n"
+"Usage:\n"
+"\n"
+"  pinoccio register \n"
+"    you will be prompted for your info.\n"
+"\n"
+"  you may also use these flags if you dont want to be prompted.\n"
+"    -n --name\n"
+"    -e --email\n"
+"    -p --password\n"
+"    -a --agree\n"
+"       agree to terms and privacy policy https://pinocc.io/terms and https://pinocc.io/privacy\n"
+"\n"
+""

function parseName(name){
  name = name||'';
  var data = {};
  var parts = name.split(/\s+/);
  data.first_name = parts[0];
  if(parts.length > 1) data.last_name = parts[parts.length-1];
  return data;
}
