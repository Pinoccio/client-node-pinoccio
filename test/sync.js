var test = require('tape');
var pinoccio = require('../');

test("can sync",function(t){
  // add a test readonly token.
  api = pinoccio("17f45b948ad14ac7a2b97596fa85c4bd");

  api.sync({stale:1}).once('data',function(data){
    t.ok(data,'got data')
    this.end();
  }).on('end',function(){
    t.end();
  })

});



