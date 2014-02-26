var rl = require('./rl.js');
// ask questions from users get data back.
module.exports = function(ask,cb){
  var r = rl();
  var stateData = {};

  var formatted = [];
  for(var i=0;i<ask.length;++i){
    (function(){
      var toAsk = ask[i];
      formatted.push([toAsk.question,function(input,next){
        toAsk.cb(input,function(value){
          stateData[toAsk.key] = value;
          next();
        })
      }])
    }());
  }

  rl.questions(r,formatted,function(){
      r.close();
      cb(false,stateData);
  });
}
