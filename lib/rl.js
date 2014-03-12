var readline = require('readline');
var bindexof = require('buffer-indexof');
var through = require('through');
module.exports = function(complete){

  var rl = readline.createInterface({
    input:process.stdin
    ,output:process.stdout
    ,completer:complete
  });

  return rl;
}

module.exports.questions = questions;

function questions(r,qs,cb){

    var currentReadLine = r;

    function run(){
      if(!qs.length) return cb(false,currentReadLine);

      var toask = qs.shift();
      var isPassword = toask[2];

      if(isPassword){

        var opts = {
          input:r.input,
          output:r.output,
          completer:r.completer
        };


        r.close();
        process.stdout.write(toask[0]);

        var bufs = [];
        var enter = new Buffer("0d","hex");// enter key
        var ctrlc = new Buffer("03","hex");// ctrl c

        var line = false;
        process.stdin.on('data',function fn(data){
          var i = bindexof(data,enter);
          if(i > -1) {

            data = data.slice(0,i);
            bufs.push(data);
            process.stdin.removeListener('data',fn);
            process.stdin.setRawMode(false);
            currentReadLine = r = readline.createInterface(opts);

            var password = Buffer.concat(bufs).toString().trim();
            process.stdout.write("\n");
            return toask[1](password,run);
          } else if(bindexof(data,ctrlc) > -1){
            process.exit();
          }

          bufs.push(data);

        });
        
        process.stdin.setRawMode(true);
        process.stdin.resume();
      } else {

        r.question(toask[0],function(data){
          toask[1](data,run);
        });
      }
    }

    run();
}
