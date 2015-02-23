#!/usr/bin/env node

var exec = require('child_process').exec;
var fs = require('fs');
var join = require('path').join;
var basename = require('path').basename;

var async = require('async');

/**
 * Return true if the given file path is a directory.
 *
 * @param  {String}   file
 * @param  {Function} callback
 */
function isDirectory(file, callback) {
  fs.stat(file, function(err, stats) {
    if (err) {
      var message = [
        'Something went wrong on "' + file + '"',
        'Message: ' + err.message
      ].join('\n');
      console.log(message);
      return callback(false);
    }
    callback(stats.isDirectory());
  });
}

/**
 * Check if the given directory is a git repo.
 *
 * @param  {String}   dir
 * @param  {Function} callback
 */
function isGitProject(dir, callback) {
  fs.exists(join(dir, '.git'), callback);
}

/**
 * Run the given command.
 *
 * @param  {String} command
 * @param  {Object} options
 */
function run(command, options, callback) {
  options = options || {};
  exec(command, options, callback);
}

/**
 * Check if remote tracking repo is defined.
 *
 * @param  {String}   dir
 * @param  {Function} callback
 */
function hasRemoteRepo(dir, callback) {
  var command = 'git remote show';
  run(command, { cwd: dir }, function(err, stdout, stderr) {
    if (err || stderr) {
      var message = [
        'Something went wrong on "' + dir + '"',
        'Command: ' + command,
        'Message: ' + err.message || stderr
      ].join('\n');
      console.log(message);
      return callback(false);
    }
    if (!stdout) {
      console.log('\033[36m' + basename(dir) + '/\033[39m');
      console.log('Remote tracking repository is not defined\n');
    }
    callback(!!stdout);
  });
}

/**
 * Run "git pull" on the given directory.
 *
 * @param  {String}   dir
 * @param  {Function} callback
 */
function gitPull(dir, callback) {
  var command = 'git pull';
  run(command, { cwd: dir }, function(err, stdout, stderr) {
    if (err || stderr) {
      var message = [
        'Something went wrong on "' + dir + '" ...',
        'Command: ' + command,
        'Message: ' + err.message || stderr
      ].join('\n');
      return new Error(message);
    }
    console.log('\033[36m' + basename(dir) + '/\033[39m');
    if (stdout) {
      console.log(stdout);
    }
    callback();
  });
}

function main(parentDir) {
  // Set start point, defalut is current directory
  var parent = parentDir || '.';

  // Retrieve files in a parent directory
  fs.readdir(parent, function(err, children) {
    if (err) {
      return console.log(err.message);
    }

    // Concatenate file name and its absolute path
    var files = children.map(function(child) {
      return join(parent, child);
    });

    // Returns files
    async.filter(files, isDirectory, function(dirs) {

      // Returns git projects
      async.filter(dirs, isGitProject, function(gitProjects) {

        // Ignore if project does not have remote tracking repo
        async.filter(gitProjects, hasRemoteRepo, function(trackingRepos) {

          async.each(trackingRepos, gitPull, function(err) {
            if (err) {
              console.log(err.message);
              return;
            }
            console.log('Done!');
          });
        });
      });
    });
  });
}

// Parse command line arguments
var argv = process.argv.slice(2);
main(join(process.cwd(), argv.shift()));