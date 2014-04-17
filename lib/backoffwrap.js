
module.exports = function(backoff,log){

  backoff.on('backoff',function(number,delay){
    if(log) log(number,delay);
  });

  return function(cb){
    backoff.once('ready',cb);
    backoff.backoff();
  }
}
