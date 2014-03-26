
module.exports.active = false;

module.exports = function(){
  var chars = ["▙","▛","▜","▟"];
  var i = 0;

  process.stdout.write('\x1B[?25l');
  module.exports.active = true;
  var t = setInterval(function(){
    process.stdout.write("\b"+chars[i++%chars.length]);
  },80);

  var end = function(){
    module.exports.active = false;
    process.stdout.write("\b");
    module.exports.restore();
    clearInterval(t);
  }
  module.exports.active = end;
  return end;
}

module.exports.restore = function(){
  process.stdout.write('\x1B[?25h')
}

