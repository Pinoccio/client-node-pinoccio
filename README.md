[![Build Status](https://secure.travis-ci.org/Pinoccio/client-node-pinoccio.png)](http://travis-ci.org/Pinoccio/client-node-pinoccio)

pinoccio
=============
Pinoccio Node.js, CLI and Browser api!

#### browser or server
```js

var pinoccio = require('pinoccio'); // works in browserify and server side

// create an api instance with default options
var api = pinoccio(logintoken);// in the browser the token may be read from a pinoccio_id cookie,

api.rest({url:"/v1/troops"},function(error,data){
  if(error) return console.log('oh no. i got an error getting my troops!',error);
  console.log('troop data',data);
})

```

#### cli

```sh
pinoccio help rest
pinoccio rest get v1/troops
```


## API DOCS

https://docs.pinocc.io/api.html
  
##INSTALL  

as a node library
```
npm install --save pinoccio
```

for cli
```
npm install -g pinoccio
```

in the browser you can use the hosted version.

```html
<script src="https://api.pinocc.io/pinoccio.js"></script>
<script>
 var api = pinoccioAPI();
 // use the api
</script>
```

or serve the browserified (compiled) file published with the module from your own web server.
```
./node_modules/pinoccio/pinoccio-api.js
```

