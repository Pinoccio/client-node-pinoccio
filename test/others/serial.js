var serial = require('../lib/serial')
var test = require('tape');

test("test run bitlash.",function(t){

  var o = serial();

  o.list(function(err,ports){
    t.ok(!err,'should not have erro listing ports');

    console.log(ports)

    var scout = ports[0];

    o.connect(scout,function(err,bitlash){
      t.ok(!err,'should not have error conecting to serial port '+err);
      bitlash.command('wifi.report',function(err,data){
        t.ok(!err,'should not have an error running command');
        t.ok(data,'should have data');
        console.log(data);

        t.end();
        setTimeout(function(){
        bitlash.close();
        },4000);
      });
    })

  });

})

