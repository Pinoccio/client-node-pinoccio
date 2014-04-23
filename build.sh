#!/bin/bash
echo 'module.exports = "'`node -e "console.log(require('./package.json').version)"`'"' > _version.js
browserify browser.js -o pinoccio-api.js
