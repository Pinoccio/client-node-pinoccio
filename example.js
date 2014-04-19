
var pinoccio = require('pinoccio');
 
var token = "my access token here";
 
var api = pinoccio(token);

var s = api.sync();
 
s.on('data',function(data){
  // handle the data event here!
  console.log('event!',data);

  

});

s.on('error',function(err){
  console.log('sync error: ',err)
  // should exit here or remake the sync stream.
}).on('end',function(){
  console.log("shouldn't end but depending on arguments it may");
  // 
})
