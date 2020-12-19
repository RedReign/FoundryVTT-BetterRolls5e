var fs = require('fs');
console.log(JSON.parse(fs.readFileSync('./betterrolls5e/module.json', 'utf8')).version);