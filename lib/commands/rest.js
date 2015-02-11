var qs = require('querystring');
var through = require('through');
var repipe = require('repipe');
var backoff = require('backoff');

module.exports = function(args,api,config,cb){
    
    var method = args._[1]||args.m||args.method;
    var service = args._[2]||args.s||args.service; 
    var data = args._[3];

    var restVerbs = ['delete', 'get', 'patch', 'post', 'put'];
    if (restVerbs.indexOf(method.toLowerCase()) === -1) {
        console.log('Invalid REST verb has been specified: ' + method + '\n' +
                    'Valid REST verbs are: ' + restVerbs.join(', '));
        process.exit(1);
    }

    if (!service) {
        console.log('No service has been specified.\n\n' + usage);
        process.exit(1);
    }

    if(data && typeof data !== 'object') {
      if(data.indexOf('{') === 0) {
        data = JSON.parse(data);
      } else {
        data = qs.parse(data);
      }
    }

    data = data||{};
    
    var reserved = ['_','$0','m','s','method','service'];

    Object.keys(args).forEach(function(k){
      if(reserved.indexOf(k) > -1) return;
      data[k] = args[k];
    });

    api.rest(method,service,data,function(err,data){
      if(err) return cb(JSON.stringify({error:err.message}));
      if(data && typeof data.pipe === "function") {
        data.pipe(process.stdout);
      } else {
        console.log(JSON.stringify(data, null, 4));
      }
      cb();
    });

};

var usage = module.exports.usage = "Usage:\n"
+"  pinoccio rest [method] [service] [data]\n"
+"    -m --method or first\n"
+"    -s --service or second\n"
+"    third\n"
+"      json encoded or query string encoded data may be the third argument or you may send..\n"
+"    --[custom] "
+"      any other flag you add to the arguments list will get sent as a key/value as data to the service.\n"
+"      for example:\n"
+"        pinoccio rest get /v1/1/1/command --command led.report\n"
+"\n"
+"run rest calls against the api.";
