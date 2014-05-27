var test = require('tape');
var pinoccio = require('../');

test("can sync",function(t){
  // add a test readonly token.
  api = pinoccio("1cc899dd27a391f0e58d03d4f290fef2");

  api.sync({stale:1}).once('data',function(data){
    t.ok(data,'got data')
    this.end();
  }).on('end',function(){
    t.end();
  })

});



