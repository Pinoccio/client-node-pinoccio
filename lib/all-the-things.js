
// a nice list of a users troops and their status
module.exports = function(api,cb){

  var tree = {};
  var scoutCount = 0;

  api.rest({url:"/v1/troops"},function(err,data){
    if(err) {
      return once(err);
    }

    var c = data.length;
    data.forEach(function(o){
      tree[o.id] = o;
      scouts(o.id,function(err,scouts){
        if(err) {
          return once(err);
        }

        // keep a global count of scouts.
        scoutCount += scouts.length;

        tree[o.id].scouts = {}
        scouts.forEach(function(s){
          tree[o.id].scouts[s.id] = s;
        });


        if(!--c) {
          sync(function(err){
            once(err,tree);
          });
        }

      })
    })
  });

  function sync (cb){
    var found = 0;

    // now fill tree with sync data!
    var sync = api.sync({stale:1});

    sync.on('data',function(data){
      data = data.data;
      if(data.type == 'token') {
        sync.end();
        clearTimeout(t);
        return cb();
      }

      if(data.troop && data.scout && tree[data.troop] && tree[data.troop].scouts[data.scout]) {
        if(!data.type){
          return;
        }
        data.type = data.type.trim();
        var scout = tree[data.troop].scouts[data.scout];
        scout[data.type] = data.value;
        if(!scout.lastCheckIn) scout.lastCheckIn = 0;
        if(scout.lastCheckIn < data.time) scout.lastCheckIn = data.time;

        if(!tree[data.troop].lastCheckIn) tree[data.troop].lastCheckIn = 0;
        if(tree[data.troop].lastCheckIn < data.time) tree[data.troop].lastCheckIn = data.time;
      }
    })

    sync.on('error',function(err){
      cb(err);
    });

    // if after timeout i have not found all scouts just render tree.

    var t = setTimeout(function(){
      // READONNLY TOKENS NEED TO HAVE ONLY THEIR TOKEN IN SYNC OTHERWISE THEY WILL ALL TIMEOUT
      cb(false); 
    },5000);


  }

  function scouts(troop,cb){
    api.rest({url:"/v1/"+troop+"/scouts"},cb);
  }

  function checkData(){
    // make sure we have all of the scout data we should have.
    // make sure all scouts that we should know about are in sync
  }

  var called = false;
  function once(err,data){
    if(called) return;
    called = true;
    cb(err,data);
  }

}


