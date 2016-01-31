/** 
 * Manage release flow for Kronos Technologies applications
 * 
 * grunt release:start:minor
 * grunt release:start:major
 * grunt release:continue
 * grunt release:finish
 * grunt hotfix:start:branch-name
 * grunt hotfix:fihish:branch-name
 * grunt feature:start
 * grunt feature:finish
 *
 */

'use strict';

var execSync = function(cmd) {
  var exec = require('sync-exec');
  var result = exec(cmd);
  return result.stdout;
}

var spawnSync= function(cmd) {
  var args = cmd.split(' ');
  var program = args.shift();
  var child  = require('child_process').spawnSync(program, args);
  var stdout = (child.stdout) ? child.stdout.toString(): '';
  var stderr = (child.stderr) ? child.stderr.toString(): '';
  return {
    code: child.status,
    stdout: stdout,
    stderr: stderr,
  }
}

Array.prototype.contains = function(obj) {
      return this.indexOf(obj) > -1;
};

String.prototype.in = function(obj) {
  return obj.contains(this);
}

var nodeSpawn = function(jsFile) {
  var spawn = require('child_process').spawn;
  var path = require('path');
  var cmd = path.join(__dirname, jsFile);
  spawn('node', [cmd], {
    detached: true
  });
}

// git custom functions
var branchExists = function (branch)  {
  return ! Boolean(spawnSync('git show-ref --verify --quiet refs/heads/' + branch).code);
}

var upstreamExists = function (remote, upstream) {
  return ! Boolean(spawnSync('git ls-remote --exit-code ' + remote + ' ' + upstream).code);
}

var getLatestTag = function (remote, branch) {
  var tag = spawnSync('git fetch -q ' + remote + ' ' + branch  + ' && git describe --tags --abbrev=0 ' + remote + '/' + branch).stdout.trim();
  return tag;

}
var deleteBranch = function (branch)  {
  spawnSync(`git branch -D ${branch}`);
}

var countCommits = function (refA, refB) {
  // Count number of commits ahead of release branch
  spawnSync(`git fetch`);
  var diff = spawnSync(`git rev-list --count --left-right ${refA}...${refB}`);
  var aDiff = diff.stdout.split('\t');
  var after = aDiff[0].trim();
  var before = aDiff[1].trim();
  console.log(`${refA} is ${after} commit(s) after ${refB}`);
  console.log(`${refA} is ${before} commit(s) before ${refB}`);
  return {
    after: after,
    before: before
  };
}

var getVersion = function(grunt, versionFile) {
  var VERSION_REGEXP = /([\'|\"]?version[\'|\"]?[ ]*:[ ]*[\'|\"]?)([\d||A-a|.|-]*)([\'|\"]?)/i;
  var version = null;
  grunt.file.read(versionFile).replace(VERSION_REGEXP, function(match, prefix, parsedVersion, suffix) {
    version = parsedVersion
  });

  if (!version) {
    grunt.fatal('Could not find version in ' + options.versionFile);
  }
  return version

}


module.exports = function(grunt) {

  var DEFAULT_OPTIONS = {
    devBranch: 'refactor/puppet',
    releaseBranch: 'release/main',
    stableBranch: 'stable/main',
    upstreamBranch: 'upstream',
    hotfixBranchPrefix: 'hotfix/',
    featureBranchPrefix: 'feature/',
    remote: 'origin',
    versionFile: 'package.json'
  };
  
  var configureGitTasks = function(options){

    //var lastStableTag = execSync('git fetch -q ' + options.remote + ' ' + options.stableBranch + ' && git describe --tags --abbrev=0 ' + options.remote + '/' + options.stableBranch).trim();

    var lastStableTag = getLatestTag(options.remote, options.stableBranch);

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
      changelog: {
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
      grunt.task.run('changelog');
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
      if(upstreamExists(options.remote, hotfixBranch)) {
        grunt.task.run('gitpull:hotfix');
      }
      grunt.task.run('gitcheckout:stable');
      grunt.task.run('gitpull:stable');
      grunt.task.run('gitmerge:hotfix');
      grunt.task.run('bump-only:patch');
      grunt.task.run('changelog');
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
  
  grunt.registerTask('f', 'alias to feature', 'feature')
  grunt.registerTask('feat', 'alias to feature', 'feature')
  grunt.registerTask('feature', 'Prepare a feature', function(featureCmd, featureName) {
    
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
      if(upstreamExists(options.remote, featureBranch)) {
        grunt.task.run('gitpull:feature');
      }
      grunt.task.run('gitcheckout:dev');
      grunt.task.run('gitpull:dev');
      grunt.task.run('gitmerge:feature');
    }
    else {
      grunt.fatal('Invalid feature command "' + featureCmd + '". Should be start|finish.');
    }

  });
  
  var DESC = 'Repackage upstream';
  grunt.registerTask('upstream', DESC, function(cmd, upstreamVersion) {
      
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
      
    if(cmd == 'merge'){
      grunt.task.run('gitcheckout:dev');
      grunt.task.run('gitpull:dev');
      grunt.task.run('gitmerge:upstream');
      grunt.log.ok('please review upstream merge and commit to devBranch');
    } 
    else if (cmd == 'pack') {
        
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
    else if (cmd == 'repack'){
      grunt.task.run('gitcheckout:dev');
      grunt.task.run('gitpull:dev');
      grunt.task.run('bump:pre')
      grunt.task.run('gitpush:dev');
      grunt.task.run('upstream:release');
    }
    else if (cmd == 'release'){
      grunt.task.run('gitcheckout:release');
      grunt.task.run('gitpull:release');
      grunt.task.run('gitmerge:dev');
      grunt.task.run('upstream:tag')
      grunt.task.run('gitpush:release');
      grunt.task.run('gitcheckout:dev');

    }
    else if (cmd == 'stable'){
      grunt.task.run('gitcheckout:stable');
      grunt.task.run('gitpull:stable');
      grunt.task.run('gitmerge:release');
      grunt.task.run('gitpush:stable');
      grunt.task.run('gitcheckout:dev');
    }
    else if(cmd == 'tag'){
      var version = getVersion(grunt, options.versionFile);
      grunt.config.merge({
        gittag: {
          upstream: {
            options: {
              tag: 'v' + version
            }
          }
        }
      });
      grunt.task.run('gittag:upstream')
      grunt.log.ok('Tagged version : ' + version);
    }
    else {
      grunt.fatal('Invalid release command "' + cmd + '". Should be merge|pack|repack|release|stable.');
    }
  });

  grunt.registerTask('sleep', 'Wait for push triggers', function(arg1, arg2) {
    var sleep = require('sleep');
    grunt.log.ok('Waiting 30 seconds for magic to happen (jenkins build)');
    sleep.sleep(30)
  });

  grunt.registerTask('github:pr', 'Open browser to create a PR at github', function() {
    nodeSpawn('../node_modules/pullrequest/index.js');
  });

  var ask = function (question) {
    var readlineSync = require('readline-sync');
    var answer = readlineSync.question(question);
    return answer;
  }

  var DESC = 'DevOps Versioning';
  grunt.registerTask('do', DESC, function(cmd, opt, arg){

    var options = this.options(DEFAULT_OPTIONS);
    configureGitTasks(options);

    var resolveCommandAliases = function (command){
       return command.in([ 'feat', 'f' ])   ? "feature": 
              command.in([ 'rel', 'r' ])    ? "release": 
              command.in([ 'pr' ])          ? "pull-request": 
              command;
    }

    switch(resolveCommandAliases(cmd))
    {
      case 'feature':
        var feature = arg ? arg : grunt.fatal('Feature name not given as argument');
        var featureBranch = options.featureBranchPrefix + feature;

        grunt.config.merge({
          gitcheckout: {
            feature: {
              options: {
                branch: featureBranch,
              }
            }
          }
        });
        if ( opt == 'start' ) {
          if (branchExists(featureBranch)) {
            grunt.fatal('Feature name already exists');
          } 
          else if (upstreamExists(options.remote, featureBranch)) {
            grunt.fatal('Feature name already on remote');
          }
          else {
            grunt.log.writeln('Starting feature branch : ' + featureBranch);
            grunt.task.run('gitcheckout:dev');
            grunt.task.run('gitpull:dev');
            grunt.config.merge({
              gitcheckout: {
                feature: {
                  options: {
                    create: true
                  }
                }
              }
            });
            grunt.task.run('gitcheckout:feature');
          }
        } else if ( opt == 'squash') {
          //FS
          if (( ! branchExists(featureBranch) ) && (! upstreamExists(options.remote, featureBranch))) {
            grunt.fatal('Feature does not exist locally or remotely. Please create it first.');
          } 

          if (branchExists(featureBranch)) {
            grunt.task.run('gitcheckout:feature');
          }

          if (upstreamExists(options.remote, featureBranch)) {
            grunt.config.merge({
              gitpull: {
                feature: {
                  options: {
                    branch: featureBranch,
                  }
                }
              }
            });
            grunt.task.run('gitpull:feature');
          }

          var diffDev = countCommits(featureBranch, `${options.remote}/${options.devBranch}`);

          if (parseInt(diffDev.after) == 0) {
            grunt.fatal(`${featureBranch} has no new commits in relation to ${options.devBranch}: there is no squash.`);
          }

          var diffRemote = countCommits(featureBranch, `${options.remote}/${featureBranch}`);
          if (parseInt(diffRemote.before) > 0) {
            grunt.fatal(`There are new commits upstream. You should pull ${featureBranch} from ${options.remote}.`);
          }
 
          var backupBranch = `backup-${featureBranch}`;
          if ( branchExists(backupBranch) ) {
            var ans = ask(`Safety backup branch ${backupBranch} already exists. Shall I delete it? [y/N]: `).trim();
            if (ans.toUpperCase() == 'Y') { 
              deleteBranch(backupBranch);
            }
            else {
              grunt.fatal('I will let you delete it then. Better safe than sorry.');
            }
          }
          grunt.config.merge({
            gitcheckout: {
              squash: {
                options: {
                  branch: `backup-${featureBranch}`,
                  create: true
                }
              }
            }
          });
          grunt.task.run('gitcheckout:squash');
          grunt.task.run('gitcheckout:feature');
          var baseCommit = spawnSync(`git merge-base ${options.devBranch} ${featureBranch}`).stdout.trim();
          var commitMessage = ask('Please enter your squash commit message: ').trim();
          grunt.config.merge({
            gitreset: {
              squash: {
                options: {
                  branch: featureBranch,
                  commit: baseCommit
                }
              }
            },
            gitadd: {
              squash: {
                options: {
                  all: true
                }
              }
            },
            gitcommit: {
              squash: {
                options: {
                  message: commitMessage 
                }
              }
            },
          });
          grunt.task.run('gitreset:squash');
          grunt.task.run('gitadd:squash');
          grunt.task.run('gitcommit:squash');
        } else if ( opt == 'finish') {
          // FF
          grunt.config.merge({
            gitcheckout: {
              feature: {
                options: {
                  branch: featureBranch
                }
              }
            },
            gitpush: {
              feature: {
                options: {
                  branch: featureBranch,
                  force: true
                }
              }
            },
            gitpull: {
              feature: {
                options: {
                  branch: featureBranch,
                }
              }
            }
          });

          if (upstreamExists(options.remote, featureBranch) && ! branchExists(featureBranch)) {
            grunt.fatal('Please ensure feature is a local branch.');
          }


          if (branchExists(featureBranch)) {
            if (upstreamExists(options.remote, featureBranch)) {
              // there is an upstream
              // check feature vs remote
              var diffRemote = countCommits(featureBranch, `${options.remote}/${featureBranch}`);

              if (parseInt(diffRemote.before) == 0 && parseInt(diffRemote.after) == 0) {
                grunt.log.ok('Branches are even.');
              }
              else if (parseInt(diffRemote.before) > 0 && parseInt(diffRemote.after) > 0) {
                grunt.fatal('Please manually reconcile branches before you proceed.');
              }
              else if (parseInt(diffRemote.after) > 0 && parseInt(diffRemote.before) == 0 )
              {
                grunt.log.ok('Pushing feature to remote.');
                grunt.task.run('gitpush:feature');
              }
              else if (parseInt(diffRemote.before) > 0 && parseInt(diffRemote.after) == 0 )
              {
                grunt.log.ok('Pulling features from remote');
                grunt.task.run('gitpull:feature');
              }
              else {
                grunt.fatal('Unknown error comparing local branch to remote branch.');
              }
            }
            else {
              // there is no upstream
              // check local vs devRemote: is it worth pushing?
              var diffDev = countCommits(featureBranch, `${options.remote}/${options.devBranch}`);

              if (parseInt(diffDev.after) > 0 && parseInt(diffDev.before) == 0) { 
                grunt.log.ok('Pushing feature branch upstream as it contains commits not in master');
                grunt.task.run('gitpush:feature');
              }
              else if (parseInt(diffDev.before) > 0) {
                // master has changes that should be merged
                grunt.fatal(`You should merge ${options.devBranch} in ${featureBranch} prior to feature finish.`);
              } 
              else if (parseInt(diffDev.after) == 0) {
                grunt.fatal(`${featureBranch} has no new commits in relation to ${options.devBranch}: there is no need to release upstream.`);
              } 
              else {
                grunt.fatal('Unknown error comparing local branch to devBranch.');
              }
            }
            grunt.task.run('gitcheckout:feature');
          } else {
            if (upstreamExists(options.remote, featureBranch)) {
              grunt.fatal('Please advise');
            }
            else {
              grunt.fatal('Feature does not exist locally or remotely. Please create it first.');
            }
          }

          grunt.log.ok('Starting PR');
          grunt.task.run('github:pr');
        } else {
          //do nothing yet
        }
        break
      case 'pull-request':
        grunt.log.ok('PR')
        break;
      case 'release':
        grunt.log.ok('release');
        break;
    }
  
    var resolveActionAliases = function (action){
      return action.in([ 'feat', 'f' ])   ? "feature": 
             action.in([ 'rel', 'r' ])    ? "release": 
             action.in([ 'pr' ])          ? "pull-request": 
             action;
    }

    /*
     * grunt do:feature:start
     * grunt do:feature:finish
     * grunt do:start
     * grunt do:continue
     * grunt do:finish
     */
    if ( cmd == 'feature' ) {
    }
    else if ( cmd == 'pr' ) {
      //validate branch status
      grunt.task.run('github:pr');
    }
    else if ((cmd == 'start' || cmd == 'go') && (opt == 'minor' || opt == 'major')) {
      grunt.task.run('gitcheckout:dev');
      grunt.task.run('gitpull:dev');
      grunt.task.run('bump:pre' + opt);
      grunt.task.run('gitpush:dev');
    }
    else if(cmd == 'continue' || cmd == 'up') {
      grunt.task.run('gitcheckout:dev');
      grunt.task.run('gitpull:dev');
      grunt.task.run('bump:prerelease');
      grunt.task.run('gitpush:dev');
    }
    else if(cmd == 'finish' || cmd == 'ne'){
      grunt.task.run('gitcheckout:dev');
      grunt.task.run('gitpull:dev');
      grunt.task.run('bump-only:patch');
      grunt.task.run('changelog');
      grunt.task.run('bump-commit');
      grunt.task.run('do:tag');
    }
    else if(cmd == 'tag' || cmd == 't'){
      var version = getVersion(grunt, options.versionFile);
      grunt.config.merge({
        gittag: {
          dev: {
            options: {
              tag: 'v' + version
            }
          }
        }
      });
      grunt.task.run('gittag:dev')
      grunt.log.ok('Tagged version : ' + version);
    }
    else {
      grunt.fatal('Invalid DO command "' + cmd + '". Should be start:minor | start:major | continue | finish');
    }
  });
};

