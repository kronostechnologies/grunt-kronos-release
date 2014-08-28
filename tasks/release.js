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

var semver = require('semver');

module.exports = function(grunt) {

  var DEFAULT_OPTIONS = {
    devBranch: 'master',
    releaseBranch: 'release/main',
    stableBranch: 'stable/main',
    hotfixBranchPrefix: 'hotfix/',
    remote: 'origin',
    versionFile: 'package.json'
  };

  var configureGitTasks = function(options){
    grunt.config.merge({
      gitpull: {
        dev: {
          options: {
            remote : options.remote,
            branch : options.devBranch
          }
        },
        release: {
          options: {
            remote : options.remote,
            branch : options.releaseBranch
          }
        },
        stable: {
          options: {
            remote : options.remote,
            branch : options.stableBranch
          }
        }
      },
      gitcheckout: {
        dev: {
          options: {
            branch : options.devBranch
          }
        },
        release: {
          options: {
            branch : options.releaseBranch
          }
        },
        stable: {
          options: {
            branch : options.stableBranch
          }
        }
      },
      gitmerge: {
        dev: {
          options: {
            branch : options.devBranch,
            noff: true
          }
        },
        release: {
          options: {
            branch : options.releaseBranch,
            noff: true
          }
        },
        stable: {
          options: {
            branch : options.stableBranch,
            noff: true
          }
        }
      },
      gitpush: {
        dev: {
          options: {
            remote: options.remote,
            branch : options.devBranch,
            tags: true
          }
        },
        release: {
          options: {
            remote: options.remote,
            branch : options.releaseBranch,
            tags: true
          }
        },
        stable: {
          options: {
            remote: options.remote,
            branch : options.stableBranch,
            tags: true
          }
        }

      }
    });

  };

  var VERSION_REGEXP = /([\'|\"]?version[\'|\"]?[ ]*:[ ]*[\'|\"]?)([\d||A-a|.|-]*)([\'|\"]?)/i;


  var DESC = 'release';
  grunt.registerTask('release', DESC, function(releaseCmd, versionType) {
    
    var options = this.options(DEFAULT_OPTIONS);
    configureGitTasks(options);

    if (releaseCmd == 'start') {
      grunt.log.writeln('Starting release');
      
      if (typeof versionType == 'undefined'){
        versionType = 'minor';
      }

      if (versionType != 'minor' && versionType != 'major'){
        grunt.fatal('Invalid version type "' + versionType + '" should be minor|major.');
      }

      var bumpType = 'pre' + versionType;
    
      grunt.task.run('gitpull:dev');
      grunt.task.run('gitpull:release');
      grunt.task.run('gitcheckout:release');
      grunt.task.run('gitmerge:dev');
      grunt.task.run('bump:' + bumpType);   
    }
    else if(releaseCmd == 'continue'){
      grunt.log.writeln('Continue release');

      grunt.task.run('gitcheckout:release');
      grunt.task.run('bump:prerelease');

    }
    else if(releaseCmd == 'finish'){
      grunt.log.writeln('Finishing release');

      grunt.task.run('gitpull:release');
      grunt.task.run('gitpull:stable');
      grunt.task.run('gitcheckout:release');

      // Remove the prerelease
      grunt.task.run('bump-only:patch');
      grunt.task.run('changelog');
      grunt.task.run('bump-commit');
      grunt.task.run('gitcheckout:stable');
      grunt.task.run('gitmerge:release');

      var version = null;
      grunt.file.read(options.versionFile).replace(VERSION_REGEXP, function(match, prefix, parsedVersion, suffix) {
        // Version should be increment here also because bump task did not run yet.
        version = semver.inc(parsedVersion, 'patch');
      });

      if (!version) {
        grunt.fatal('Can not find a version in ' + options.versionFile);
      }

      grunt.log.writeln(version);
      grunt.config.merge({
        gittag: {
          nextRelease: {
            options: {
              tag: 'v' + version,
              message: 'Version ' +  version
            }
          }
        }
      });
      grunt.task.run('gittag:nextRelease');

      grunt.task.run('gitpush:stable');

      grunt.task.run('gitcheckout:dev');
      grunt.task.run('gitmerge:release');
      grunt.task.run('gitpush:dev');
    }
    else {
      grunt.fatal('Invalid release command "' + releaseCmd + '". Should be start|continue|finish.');
    }
  });

  
  var DESC = 'Prempare a hotfix';
  grunt.registerTask('hotfix', DESC, function(releaseCmd, hotfixName) {
    
    var options = this.options(DEFAULT_OPTIONS);
    configureGitTasks(options);


    if (releaseCmd == 'start') {

      
      if (typeof hotfixName == 'undefined'){
        grunt.fatal('hotfix name is required. (ex: grunt hotfix:start:fix-name)');
      }

      var hotfixBranch = options.hotfixBranchPrefix + hotfixName;
      grunt.log.writeln('Starting hotfix branch : ' + hotfixBranch);

      grunt.task.run('gitpull:stable');
      grunt.task.run('gitcheckout:stable');

      grunt.config.merge({
        gitcheckout: {
          hotfix: {
            options: {
              branch: hotfixBranch,
              create: true
            }
          }
        }
      });

      grunt.task.run('gitcheckout:hotfix');

    }
    else if(releaseCmd == 'finish'){
      
      if (typeof hotfixName == 'undefined'){
        grunt.fatal('hotfix name is required. (ex: grunt hotfix:finish:fix-name)');
      }

      var hotfixBranch = options.hotfixBranchPrefix + hotfixName;
      grunt.log.writeln('Release hotfix branch : ' + hotfixBranch);
      
      
      var version = null;
      grunt.file.read(options.versionFile).replace(VERSION_REGEXP, function(match, prefix, parsedVersion, suffix) {
        // Version should be increment here also because bump task did not run yet.
        version = semver.inc(parsedVersion, 'patch');
      });

      if (!version) {
        grunt.fatal('Can not find a version in ' + options.versionFile);
      }
      
      grunt.config.merge({
        gitpull: {
          hotfix: {
            options: {
              remote: options.remote,
              branch: hotfixBranch
            }
          }
        },
        gitcheckout: {
          hotfix: {
            options: {
              branch: hotfixBranch,
            }
          }
        },
        gitmerge: {
          hotfix: {
            options: {
              branch: hotfixBranch,
              noff: true
            }
          }
        },
        gittag: {
          hotfix: {
            options: {
              tag: 'v' + version,
              message: 'Version ' +  version
            }
          }
        },
        bump: {
          options: {
            push: false
          }
        }
      });

      //grunt.task.run('gitpull:hotfix');
      grunt.task.run('gitpull:stable');
      grunt.task.run('gitcheckout:hotfix');
      grunt.task.run('bump-only:patch');
      grunt.task.run('changelog');
      grunt.task.run('bump-commit');
      grunt.task.run('gitcheckout:stable');
      grunt.task.run('gitmerge:hotfix');
      grunt.task.run('gittag:hotfix');
      grunt.task.run('gitpush:stable');

      //TODO: Delete hotfix branch. grunt-git does not support gitbranch task
    
      grunt.log.writeln('Don\'t forget to merge back ' + options.stableBranch + ' into ' + options.devBranch + '( or in ' + options.releasBranch + ' if there is a release pending)');

    }
    else {
      grunt.fatal('Invalid hotfix command "' + releaseCmd + '". Should be start|finish.');
    }


  });

  


};

// vim: set ts=2 sw=2 sts=2 et :
