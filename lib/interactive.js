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
        if(!toAsk.cb) {
          stateData[toAsk.key] = input;
          return next();
        }
        toAsk.cb(input,function(value){
          stateData[toAsk.key] = value;
          next();
        })
      },toAsk.password])// hack
    }());
  }

  rl.questions(r,formatted,function(err,r){
      r.close();
      cb(false,stateData);
  });
}
