


module.exports = function(limit){

  var o = {
    limit:limit,
    active:0,
    cbs:[],
    job:function(fn){
      this.cbs.push(fn);
      this._next();
    },
    _next:function (){
      var z = this;
      if(this.active < this.limit && this.cbs.length) {
        this.active++;
        this.cbs.shift()(function(){
          z.active--;
          z._next();
        });
      }
    }
  };

  var throttle = function(fn){
      o.job(fn);
  };


  throttle._ = o;

  return throttle;

}



