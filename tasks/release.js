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
var exec = require('sync-exec');
var sleep = require('sleep');

var execSync = function(cmd) {
  var result = exec(cmd);
  return result.stdout;
}


module.exports = function(grunt) {

  var DEFAULT_OPTIONS = {
    devBranch: 'master',
    releaseBranch: 'release/main',
    stableBranch: 'stable/main',
    upstreamBranch: 'upstream',
    hotfixBranchPrefix: 'hotfix/',
    featureBranchPrefix: 'feature/',
    remote: 'origin',
    versionFile: 'package.json'
  };
  
  var configureGitTasks = function(options){

    var lastStableTag = execSync('git fetch -q ' + options.remote + ' ' + options.stableBranch + ' && git describe --tags --abbrev=0 ' + options.remote + '/' + options.stableBranch).trim();

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
        
      },
      bump: {
        options: {
          push: false,
          createTag: false
        }
      },
      conventionalChangelog: {
        options: {
          from: lastStableTag
        }
      }
    });
  };

  var VERSION_REGEXP = /([\'|\"]?version[\'|\"]?[ ]*:[ ]*[\'|\"]?)([\d||A-a|.|-]*)([\'|\"]?)/i;


  var DESC = 'Prepare a release';
  grunt.registerTask('release', DESC, function(releaseCmd, versionType) {
    
    var options = this.options(DEFAULT_OPTIONS);
    configureGitTasks(options);

    if (releaseCmd == 'start') {
      if (typeof versionType == 'undefined'){
        versionType = 'minor';
      }

      if (versionType != 'minor' && versionType != 'major'){
        grunt.fatal('Invalid version type "' + versionType + '" should be minor|major.');
      }

      var bumpType = 'pre' + versionType;
    
      grunt.task.run('gitcheckout:dev');
      grunt.task.run('gitpull:dev');
      grunt.task.run('gitcheckout:release');
      grunt.task.run('gitpull:release');
      grunt.task.run('gitmerge:dev');
      grunt.task.run('bump:' + bumpType);   
      grunt.task.run('gitpush:release');
    }
    else if(releaseCmd == 'continue'){
      grunt.task.run('gitcheckout:release');
      grunt.task.run('bump:prerelease');
      grunt.task.run('gitpush:release');

    }
    else if(releaseCmd == 'finish'){
      grunt.task.run('gitcheckout:release');
      grunt.task.run('gitpull:release');
      grunt.task.run('gitcheckout:stable');
      grunt.task.run('gitpull:stable');
      grunt.task.run('gitmerge:release');

      // Remove the prerelease
      grunt.task.run('bump-only:patch');
      grunt.task.run('conventionalChangelog');
      grunt.task.run('bump-commit');
      grunt.task.run('gitpush:stable');
      grunt.task.run('sleep');
      grunt.task.run('release:tag');
      //grunt.task.run('gitcheckout:release');
      //grunt.task.run('gitmerge:stable');
      //grunt.task.run('gitpush:release');
      //grunt.task.run('gitcheckout:dev');
      //grunt.task.run('gitmerge:release');
      //grunt.task.run('gitpush:dev');
    }
    else if(releaseCmd == 'finish-merge'){
      grunt.task.run('gitcheckout:release');
      grunt.task.run('gitmerge:stable');
      grunt.task.run('gitpush:release');
      grunt.task.run('gitcheckout:dev');
      grunt.task.run('gitmerge:release');
      grunt.task.run('gitpush:dev');

    }
    else if(releaseCmd == 'tag'){
      
      var version = null;
      grunt.file.read(options.versionFile).replace(VERSION_REGEXP, function(match, prefix, parsedVersion, suffix) {
        // Version should be increment here also because bump task did not run yet.
        version = parsedVersion
      });

      if (!version) {
        grunt.fatal('Can not find a version in ' + options.versionFile);
      }

      execSync('git tag -a v' + version  + ' -m "Version ' + version + '"');
      
      grunt.log.ok('Tagged version : ' + version);
    }
    else if(releaseCmd == 'status'){

      // Count number of dev commits ahead of release branch
      var rev = "origin/" + options.releaseBranch + "...origin/" + options.devBranch;
      var grep_pattern = '\'^(?!Merge branch \'"\'"\'' + options.releaseBranch  + '\'"\'"\').+$\'';
      var matches = execSync("git rev-list --count --left-right " + rev + ' --grep ' + grep_pattern + ' --perl-regexp').match(/\d+\t(\d+)/);
      var releaseAhead = (matches && matches[1] > 0);
      
      // Count number of release commits ahead of stable branch
      var rev = "origin/" + options.stableBranch + "...origin/" + options.releaseBranch;
      var matches = execSync("git rev-list --count --left-right " + rev).match(/\d+\t(\d+)/);
      var stableAhead = (matches && matches[1] > 0);

      if(!releaseAhead && !stableAhead) {
        grunt.log.ok('Released <- All dev commits are merged to release and stable branches');
      }
      else if(!releaseAhead){
        grunt.log.ok('Staging <- Next release is currently staging into release branch');
      }
      else if(!stableAhead){
        grunt.log.ok('Unreleased <- Dev branch contain unreleased commits');
      }
      else {
        grunt.log.ok('Staging+Unreleased <- Next release is currently staging into release branch ans some commit from dev branch are not staged.');
      }
    }
    else {
      grunt.fatal('Invalid release command "' + releaseCmd + '". Should be start|continue|finish.');
    }
  });

  var DESC = 'Prepare a hotfix';
  grunt.registerTask('hotfix', DESC, function(hotfixCmd, hotfixName) {
    
    var options = this.options(DEFAULT_OPTIONS);
    configureGitTasks(options);

    if (hotfixCmd == 'start') {

      
      if (typeof hotfixName == 'undefined'){
        grunt.fatal('hotfix name is required. (ex: grunt hotfix:start:fix-name)');
      }

      var hotfixBranch = options.hotfixBranchPrefix + hotfixName;
      grunt.log.writeln('Starting hotfix branch : ' + hotfixBranch);

      grunt.task.run('gitcheckout:stable');
      grunt.task.run('gitpull:stable');

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
    else if(hotfixCmd == 'finish'){
      
      if (typeof hotfixName == 'undefined'){
        grunt.fatal('hotfix name is required. (ex: grunt hotfix:finish:fix-name)');
      }

      var hotfixBranch = options.hotfixBranchPrefix + hotfixName;
      grunt.log.writeln('Release hotfix branch : ' + hotfixBranch);
      
      var upstreamExists = (execSync('git ls-remote ' + options.remote + ' ' + hotfixBranch).trim() != "");
      
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
        bump: {
          options: {
            push: false
          }
        }
      });

      grunt.task.run('gitcheckout:hotfix');
      if(upstreamExists) {
        grunt.task.run('gitpull:hotfix');
      }
      grunt.task.run('gitcheckout:stable');
      grunt.task.run('gitpull:stable');
      grunt.task.run('gitmerge:hotfix');
      grunt.task.run('bump-only:patch');
      grunt.task.run('conventionalChangelog');
      grunt.task.run('bump-commit');
      grunt.task.run('release:tag');
      grunt.task.run('gitpush:stable');

      //TODO: Delete hotfix branch. grunt-git does not support gitbranch task
    
      grunt.log.writeln('Don\'t forget to merge back ' + options.stableBranch + ' into ' + options.devBranch + '( or in ' + options.releaseBranch + ' if there is a release pending)');

    }
    else {
      grunt.fatal('Invalid hotfix command "' + hotfixCmd + '". Should be start|finish.');
    }

  });
  
  var DESC = 'Prepare a feature';
  grunt.registerTask('feature', DESC, function(featureCmd, featureName) {
    
    var options = this.options(DEFAULT_OPTIONS);
    configureGitTasks(options);

    if (featureCmd == 'start') {

      
      if (typeof featureName == 'undefined'){
        grunt.fatal('feature name is required. (ex: grunt feature:start:feature-name)');
      }

      var featureBranch = options.featureBranchPrefix + featureName;
      grunt.log.writeln('Starting feature branch : ' + featureBranch);

      grunt.task.run('gitcheckout:dev');
      grunt.task.run('gitpull:dev');

      grunt.config.merge({
        gitcheckout: {
          feature: {
            options: {
              branch: featureBranch,
              create: true
            }
          }
        }
      });

      grunt.task.run('gitcheckout:feature');

    }
    else if(featureCmd == 'finish'){
      
      if (typeof featureName == 'undefined'){
        grunt.fatal('feature name is required. (ex: grunt feature:finish:feature-name)');
      }

      var featureDescr = grunt.option('descr') || featureName;

      var featureBranch = options.featureBranchPrefix + featureName;
      grunt.log.writeln('Release feature branch : ' + featureBranch);


      var upstreamExists = (execSync('git ls-remote ' + options.remote + ' ' + featureBranch).trim() != "");

      grunt.config.merge({
        gitpull: {
          feature: {
            options: {
              remote: options.remote,
              branch: featureBranch
            }
          }
        },
        gitcheckout: {
          feature: {
            options: {
              branch: featureBranch,
            }
          }
        },
        gitmerge: {
          feature: {
            options: {
              branch: featureBranch,
              noff: true,
              message: 'feat: ' + featureDescr
            }
          }
        },
        bump: {
          options: {
            push: false
          }
        }
      });

      grunt.task.run('gitcheckout:feature');
      if(upstreamExists) {
        grunt.task.run('gitpull:feature');
      }
      grunt.task.run('gitcheckout:dev');
      grunt.task.run('gitpull:dev');
      grunt.task.run('gitmerge:feature');

      //TODO: Delete feature branch.
    

    }
    else {
      grunt.fatal('Invalid hotfix command "' + hotfixCmd + '". Should be start|finish.');
    }

  });
  
  var DESC = 'Repackage upstream';
  grunt.registerTask('upstream', DESC, function(repackCmd, upstreamVersion) {
      
    var options = this.options(DEFAULT_OPTIONS);
    configureGitTasks(options);
    grunt.config.merge({
        gitmerge: {
          upstream: {
            options: {
              branch: options.upstreamBranch,
              noff: true
            }
          }
        },
        gitcheckout: {
          upstream: {
            options: {
              branch: options.upstreamBranch,
            }
          }
        },
        gitpull: {
          upstream: {
            options: {
              branch: options.upstreamBranch,
            }
          }
        }
      });
      
    if(repackCmd == 'merge'){
      grunt.task.run('gitcheckout:dev');
      grunt.task.run('gitpull:dev');
      grunt.task.run('gitmerge:upstream');
      grunt.log.ok('please review upstream merge and commit to devBranch');
    } 
    else if (repackCmd == 'pack') {
        
      if (typeof upstreamVersion == 'undefined') {
        grunt.fatal('upstream version to repack is required. (ex: grunt upstream:pack:2.1.4)');
      }
      
      var version = grunt.file.readJSON(options.versionFile).version;
      
      if (typeof version == 'undefined'){
        grunt.fatal('Cannot find current version in ' + options.versionFile);
      }
      
      var newVersion = upstreamVersion + '-0'
      
      grunt.log.ok('Releasing master changes, changing version "' + version + '" to version "' + newVersion + '"' );
        
      grunt.task.run('gitcheckout:dev');
      execSync('grunt bump:pre --setversion=' + newVersion );
      grunt.task.run('gitpush:dev');
      grunt.task.run('upstream:release');
    }
    else if (repackCmd == 'repack'){
      grunt.task.run('gitcheckout:dev');
      grunt.task.run('gitpull:dev');
      grunt.task.run('bump:pre')
      grunt.task.run('gitpush:dev');
      grunt.task.run('upstream:release');
    }
    else if (repackCmd == 'release'){
      grunt.task.run('gitcheckout:release');
      grunt.task.run('gitpull:release');
      grunt.task.run('gitmerge:dev');
      grunt.task.run('upstream:tag')
      grunt.task.run('gitpush:release');
      grunt.task.run('gitcheckout:dev');

    }
    else if (repackCmd == 'stable'){
      grunt.task.run('gitcheckout:stable');
      grunt.task.run('gitpull:stable');
      grunt.task.run('gitmerge:release');
      grunt.task.run('gitpush:stable');
      grunt.task.run('gitcheckout:dev');
    }
    else if(repackCmd == 'tag'){
      
      var version = null;
      grunt.file.read(options.versionFile).replace(VERSION_REGEXP, function(match, prefix, parsedVersion, suffix) {
        // Version should be increment here also because bump task did not run yet.
        version = parsedVersion
      });

      if (!version) {
        grunt.fatal('Can not find a version in ' + options.versionFile);
      }

      execSync('git tag -a v' + version  + ' -m "Version ' + version + '"');
      
      grunt.log.ok('Tagged version : ' + version);
    }
    else {
      grunt.fatal('Invalid release command "' + repackCmd + '". Should be merge|pack|repack|release|stable.');
    }
  });

  grunt.registerTask('sleep', 'Wait for push triggers', function(arg1, arg2) {
      grunt.log.ok('Waiting 30 seconds for magic to happen (jenkins build)');
      sleep.sleep(30)
  });
};

// vim: set ts=2 sw=2 sts=2 et :
