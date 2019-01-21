#!/usr/bin/env node

var path = require('path');
var gitPullAll = require('.');
var cwd = process.cwd();

// Parse command line arguments
var argv = process.argv.slice(2);
var isRecursive = argv.includes('-r');
var paramOne = argv.shift();
var parentDir = cwd;

if (paramOne && paramOne != '-r') {
  parentDir = path.join(cwd, paramOne);
}
gitPullAll(parentDir, isRecursive);
