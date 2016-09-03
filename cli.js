#!/usr/bin/env node

var path = require('path');
var gitPullAll = require('.');

// Parse command line arguments
var argv = process.argv.slice(2);
var parentDir = path.join(process.cwd(), argv.shift() || '.');
gitPullAll(parentDir);