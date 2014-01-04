var readline = require('readline')

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
    function run(){
      if(!qs.length) return cb();

      var toask = qs.shift();

      r.question(toask[0],function(data){
        toask[1](data,run);
      });
    }

    run();
}
