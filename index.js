var exec = require('child_process').exec;
var fs = require('fs');
var join = require('path').join;

var async = require('async');

/**
 * Return the child directories of the given parent directory.
 *
 * @param  {String}   parent
 * @param  {Function} callback
 */
function readdirs(parent, callback) {
  fs.readdir(parent, function(err, children) {
    if (err) {
      return callback(err);
    }

    var files = children.map(function(child) {
      return join(parent, child);
    });

    async.filter(files, isGitProject, function(dirs) {
      callback(null, dirs);
    });
  });
}

/**
 * Check if file is a directory.
 *
 * @param  {String}   file
 * @param  {Function} callback
 */
function isGitProject(file, callback) {
  fs.stat(file, function(err, stats) {
    if (err) {
      console.log(err);
      return callback(false);
    }
    if (!stats.isDirectory()) {
      return callback(false);
    }
    fs.exists(join(file, '.git'), callback);
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

function gitPull(dir, callback) {
  gitRemoteShow(dir, function(err, result) {
    if (err) {
      return callback(err);
    }
    if (!result.stdout) {
      return callback(null, {
        dir: dir,
        stdout: 'Ignored because remote repository does not exist\n'
      });
    }
    var command = 'git pull';
    run(command, { cwd: dir }, function(err, stdout, stderr) {
      if (err) {
        return callback(wrapError(dir, command, err));
      }
      if (stderr) {
        return callback(wrapError(dir, command, stderr));
      }
      var ret = {
        dir: dir,
        stdout: stdout
      };
      callback(null, ret);
    });
  });
}

function gitRemoteShow(dir, callback) {
  var command = 'git remote show';
  run(command, { cwd: dir }, function(err, stdout, stderr) {
    if (err) {
      return callback(wrapError(dir, command, err));
    }
    if (stderr) {
      return callback(wrapError(dir, command, stderr));
    }
    var ret = {
      dir: dir,
      stdout: stdout
    };
    callback(null, ret);
  });
}

function wrapError(dir, command, err) {
  var message = [
    'Something went wrong on "' + dir + '" ...\n',
    'Command: ' + command,
    'Message: ' + err.message
  ].join('');
  return new Error(message);
}

// Parse command line arguments
var argv = process.argv.slice(2);
var cwd = join(process.cwd(), argv.shift() || '.');

readdirs(cwd, function(err, dirs) {
  if (err) {
    console.log(err.message);
    return;
  }

  async.map(dirs, gitPull, function(err, results) {
    if (err) {
      console.log(err.message);
      return;
    }
    results.forEach(function(result) {
      console.log('\033[36m' + result.dir + '/\033[39m');
      if (result.stdout) {
        console.log(result.stdout);
      }
    });
  });
});
