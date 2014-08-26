/** 
 * Manage release flow for Kronos Technologies applications
 * 
 * grunt release:start:minor
 * grunt release:start:major
 * grunt release:start:patch
 * grunt release:finish
 * grunt hotfix:start --branch=hotifx/branch-name
 * grunt hotfix:fihish --branch=hotifx/branch-name
 *
 */

'use strict';

var semver = require('semver');
var exec = require('child_process').exec;

module.exports = function(grunt) {

  var DESC = 'release';
  grunt.registerTask('release', DESC, function(releaseCmd, versionType) {

    if (releaseCmd == 'start') {
      grunt.log.writeln('Starting release');

    }
    else if(releaseCmd == 'finish'){
      grunt.log.writeln('Finishing release');

    }
  });
  
  var DESC = 'Prempare a hotfix';
  grunt.registerTask('release', DESC, function(releaseCmd, versionType) {

  });


};

// vim: set ts=2 sw=2 sts=2 et :
