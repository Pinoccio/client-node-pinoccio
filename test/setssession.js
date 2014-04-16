var pinoccio = require('../');
var test = require('tape');


test("make sure session is set correctly from login",function(t){

  var api = pinoccio();

  api.rest = function(opts,cb){
    setImmediate(function(){
      cb(false,{test:true});
    })
  }

  api.login('party','machine',function(err,data){
    t.ok(!err,'should not haVe erro if mocked');
    t.equals(data.test,true,'session is set from data from login rest call!');
    t.end();
  });



})
