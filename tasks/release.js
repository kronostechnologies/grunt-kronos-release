/** 
 * Manage release flow for Kronos Technologies applications
 * 
 * grunt release:start:minor
 * grunt release:start:major
 * grunt release:continue
 * grunt release:finish
 * grunt hotfix:start:branch-name
 * grunt hotfix:fihish:branch-name
 *
 */

'use strict';

//var semver = require('semver');
var exec = require('child_process').exec;


module.exports = function(grunt) {

  var DEFAULT_OPTIONS = {
    devBranch: 'master',
    releaseBranch: 'release/main',
    stableBranch: 'stable/main',
    pushTo: 'origin'
  }

  var DESC = 'release';
  grunt.registerTask('release', DESC, function(releaseCmd, versionType) {

    var options = this.options(DEFAULT_OPTIONS);

    var done = this.async();
    var queue = [];
 
    var next = function() {
      if (!queue.length) {
        return done();
      }
      queue.shift()();
    };

    var run = function(behavior){
        queue.push(behavior);
    };

    var runIf = function(condition, behavior) {
      if (condition) {
        queue.push(behavior);
      }
    };
      
    var gitPullBranches = function(options){ 
      exec('git pull --ff-only ' + options.pushTo + ' ' + options.devBranch + ' ' + options.releaseBranch + ' ' + options.stableBranch, function(err, stdout, stderr){
        grunt.log.writeln('Updating local branches from upstream.');
        if (err) {
          grunt.fatal(err);
        }
        next();
      });
    };
    
    var gitCheckout = function(branch){ 
      exec('git checkout ' + branch, function(err, stdout, stderr){
        grunt.log.writeln('checkout: ' + branch);
        if (err) {
          grunt.fatal(err);
        }
        grunt.log.writeln(stdout);
        next();
      });
    };
    
    var gitMerge = function(branch){ 
      exec('git merge --no-ff ' + branch, function(err, stdout, stderr){
        grunt.log.writeln('merge: ' + branch);
        if (err) {
          grunt.fatal(err);
        }
        grunt.log.writeln(stdout);
        next();
      });
    };


    if (releaseCmd == 'start') {
      grunt.log.writeln('Starting release');
      
      if (typeof versionType == 'undefined'){
        versionType = 'minor';
      }

      if (versionType != 'minor' && versionType != 'major'){
        grunt.fatal('Invalid version type "' + versionType + '" should be minor|major.');
      }

      var bumpType = 'pre' + versionType;
     
      //run(function() {
      //  gitPullBranches(options);
      //});

      run(function(){
        gitCheckout(options.releaseBranch);
      });

      run(function(){
        gitMerge(options.devBranch);
      });

      run(function(){
        grunt.task.run('bump:' + bumpType);
        next();
      });
      run(function(){
        grunt.log.writeln('AAAAAAAAAAAAAAAAAAAA');
        next();
      });
      next();
    }
    else if(releaseCmd == 'continue'){
      grunt.log.writeln('Finishing release');

    }
    else if(releaseCmd == 'finish'){
      grunt.log.writeln('Finishing release');

    }
    else {
      grunt.fatal('Invalid release command "' + releaseCmd + '". Should be start|continue|finish.');
    }
  });
  var DESC = 'Prempare a hotfix';
  grunt.registerTask('hotfix', DESC, function(releaseCmd) {

  });


};

// vim: set ts=2 sw=2 sts=2 et :
