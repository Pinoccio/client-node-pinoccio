var test = require('tape');
var pinoccio = require('../');

test("can sync",function(t){
  // add a test readonly token.
  api = pinoccio("e113fa4270ae050a0c706d29eca5ad25");

  api.sync({stale:1}).once('data',function(data){
    t.ok(data,'got data')
    this.end();
  }).on('end',function(){
    t.end();
  });


});



