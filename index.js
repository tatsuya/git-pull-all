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
  fs.exists(join(dir, '.git'), function(ret) {
    if (!ret) {
      console.log('\033[36m' + basename(dir) + '/\033[39m');
      console.log('Not a git repository');
    }
    callback(ret);
  });
}

/**
 * Check if the given directory is not a git repo.
 *
 * @param  {String}   dir
 * @param  {Function} callback
 */
function isNotGitProject(dir, callback) {
  fs.exists(join(dir, '.git'), function(ret) {
    callback(!ret);
  });
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
      var message = '';
      message += 'Something went wrong on "' + dir + '" ...';
      message += 'Command: ' + command;
      if (err) {
        message += 'Message: ' + err.message;
      } else if (stderr) {
        message += 'Message: ' + stderr;;
      }
      console.log(message);
      return callback(false);
    }
    if (!stdout) {
      console.log('\033[36m' + basename(dir) + '/\033[39m');
      console.log('Remote tracking repository is not defined');
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
    if (err) {
      var message = [
        'Something went wrong on "' + dir + '" ...',
        'Command: ' + command,
        'Message: ' + err.message
      ].join('\n');
      return callback(new Error(message));
    }
    console.log('\033[36m' + basename(dir) + '/\033[39m');
    if (stdout) {
      process.stdout.write(stdout);
    }
    if (stderr) {
      process.stdout.write(stderr);
    }
    callback();
  });
}

function readFiles(dir, callback) {
  fs.readdir(dir, function(err, children) {
    if (err) {
      return callback(err);
    }
    var files = children.map(function(child) {
      return join(dir, child);
    });
    return callback(null, files);
  });
}

function pullFromDirectoryRecursively(dir){
  pullFromDirectory(dir);
  readFiles(dir, function(err, files) {
    if (err) {
      return console.log(err.message);
    }

    // Returns files
    async.filter(files, isDirectory, function(dirs) {
      // Returns non-git projects
      async.filter(dirs, isNotGitProject, function(nonGitProjects) {
        // pull recursively for non-git projects
        async.each(nonGitProjects, pullFromDirectoryRecursively, function(err) {
          if (err) {
            console.log(err.message);
            return;
          }
        })
      });
    });
  });
}

function pullFromDirectory(parent) {
  readFiles(parent, function(err, files) {
    if (err) {
      return console.log(err.message);
    }

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
          });
        });
      });
    });
  });
}

/**
 * Main function.
 *
 * @param  {String} parent
 */
module.exports = function(parent, isRecursive) {
  if (isRecursive) {
    pullFromDirectoryRecursively(parent);
  }else{
    pullFromDirectory(parent);
  }
  console.log('Done!');
};
