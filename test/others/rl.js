


var rl = require('../rl')

var state = false;
var stateData = {};

var help = function(){
  console.log('pinoccio api client')
  console.log('commands:',['login','help']);
}

help()

rl(function(r,line,cb){

  if(!state){
    stateData = {};
    if(line == 'login') {
      state = 'login';
    } else {
      if(line === 'help' || line === 'ls') help();   
      cb();
    }
  }

  if(state == 'login') {

    questions(r,[
      ["user or email:",function(data,next){
        stateData.email = data;
        next();
      }],
      ["password:",function(data,next){
        stateData.password = data;
        next();
      }]
    ],function(){
        console.log('todo login with this',stateData);
        state = false;
        cb();
    });

  }

});


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
