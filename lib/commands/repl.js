// command command!

var rest = require('./rest.js');
var braceStream = require('../brace-stream');
var rl = require('../rl');
require('colors');

module.exports = function(args,api,config,cb){

  var troop = args._[1]||args.t||args.troop;
  var scout = args._[2]||args.s||args.scout;

  var functions = [];
  var buf = '';
  var ints = 0;

  console.log('starting repl for troop ',troop,' and scout ',scout);

  // TODO SYNC
  var help = false;
  var repl = rl(function completer(linePartial, callback) {
    var filtered = autoCompleteFilter(linePartial,functions);
    
    callback(null, [filtered, linePartial]);

    if(help) return;

    help = true;
    command("help",function(err,help){
      process.stdout.write("\nloading help.".grey+"\n");
      repl.prompt(true);
      var lines = help.split("\r\n");
      var start = false;
      lines.forEach(function(l){
        if(l.indexOf('Functions:') === 0){
          start = true;
        } else if(start){
          if(l.indexOf('function ') === 0) {
            // user function
            
          } else {
            functions.push.apply(functions,l.split(" "));
          }
        }
      })

      functions.sort();
    });

  });

  var prompt = 'scout '+troop+'/'+scout+'> ';

  repl.setPrompt(prompt);(args._[2]||args.s||args.scout)
  repl.prompt();

  var bs = braceStream();
  repl.on('line',function(l){
    bs.write(l);
  });

  repl.on('SIGINT',function(){
    if(ints == 0){ 
      ints = 1;
      buf = '';
      console.log("");
      console.log("ctrl+c again to exit".grey);
      repl.setPrompt(prompt);
      repl.prompt();
    } else {
      console.log('');
      process.exit();
    }
  });

  bs.on('data',function(obj){
    ints = 0;
    if(obj.level === 0) {

      var line = obj.line.trim();
      if(!line.length) return repl.prompt();

      command(buf+obj.line,function(err,data){
        if(err) console.log('Error:',err);
        console.log(data);
        repl.setPrompt(prompt);
        repl.prompt();
      });

      buf = '';
    } else {
      buf += obj.line;
      repl.setPrompt(pad('...',prompt.length-2)+'> ');
      repl.prompt();
    }
  });

  function command(line,cb){
    api.rest('post','/v1/'+troop+'/'+scout+'/command',{command:line},function(err,data){
      if(err) return cb(JSON.stringify({error:err.message}));
      cb(false,data.reply.length?data.reply:"done".green);
    });
  }

  function autoCompleteFilter(line,functions){
    var filtered = [];

    // get the last chunk of the line partial
    var c,search = '';
    for (var j=line.length; j>0; j-- ) {

      c = line.charAt(j);
      if(c == ';' || c == ' ' || c == '}' || c == '('){
        break;
      }

    }

    search = line.substr(j);
 
    for(var i = 0;i<functions.length;++i){
      if(functions[i].indexOf(search) === 0) {
        filtered.push(functions[i]);
      }
    }

    return filtered;
  }

}

module.exports.usage = "repl\n"
+"\n"
+"Usage:\n"
+"  pinoccio repl [troop] [scout]\n"
+"    -t --troop or first\n"
+"    -s --scout or second\n"
+"\n"
+"launches an interactive ScoutScript command prompt\n"
+"run commands on scouts in your troop.\n"
+"\n"

function pad(str,len){
  len -= str.length;
  while(len > 0){
    str += " ";
    --len;
  }  
  return str;
}

