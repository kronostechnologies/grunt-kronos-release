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
const child_process = require('child_process');

const execSync = function(cmd) {
  return child_process.execSync(cmd).toString();
};


module.exports = function(grunt) {

  const DEFAULT_OPTIONS = {
    devBranch: 'master',
    releaseBranch: 'release/main',
    stableBranch: 'stable/main',
    upstreamBranch: 'upstream',
    hotfixBranchPrefix: 'hotfix/',
    featureBranchPrefix: 'feature/',
    remote: 'origin',
    versionFile: 'package.json'
  };

  const configureGitTasks = function(options){

    let lastStableTag = execSync('git fetch -q ' + options.remote + ' ' + options.stableBranch + ' && git describe --tags --abbrev=0 ' + options.remote + '/' + options.stableBranch).trim();
    const devMergeCiSkipMessage = 'Merge branch \'' + options.devBranch + '\'\n\n[ci skip]';
    const releaseMergeCiSkipMessage = 'Merge branch \'' + options.releaseBranch + '\'\n\n[ci skip]';
    const stableMergeCiSkipMessage = 'Merge branch \'' + options.stableBranch + '\'\n\n[ci skip]';

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
        devCiSkip: {
          options: {
            branch : options.devBranch,
            noff: true,
            message: devMergeCiSkipMessage
          }
        },
        release: {
          options: {
            branch : options.releaseBranch,
            noff: true
          }
        },
        releaseCiSkip: {
          options: {
            branch : options.releaseBranch,
            noff: true,
            message: releaseMergeCiSkipMessage
          }
        },
        stable: {
          options: {
            branch : options.stableBranch,
            noff: true
          }
        },
        stableCiSkip: {
          options: {
            branch : options.stableBranch,
            noff: true,
            message: stableMergeCiSkipMessage
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

  const VERSION_REGEXP = /([\'|\"]?version[\'|\"]?[ ]*:[ ]*[\'|\"]?)([\d||A-a|.|-]*)([\'|\"]?)/i;

  const runBumpPatch = () => {
    if(grunt.task.exists('conventionalChangelog')) {
      grunt.task.run('bump-only:patch');
      grunt.task.run('conventionalChangelog');
      grunt.task.run('bump-commit');
    }
    else {
      grunt.task.run('bump:patch');
    }
  };

  grunt.registerTask('release', 'Prepare a release', function(releaseCmd, versionType) {

    const options = this.options(DEFAULT_OPTIONS);
    let version;
    configureGitTasks(options);

    if (releaseCmd === 'start') {
      if (typeof versionType == 'undefined'){
        versionType = 'minor';
      }

      if (versionType !== 'minor' && versionType !== 'major'){
        grunt.fatal('Invalid version type "' + versionType + '" should be minor|major.');
      }

      const bumpType = 'pre' + versionType;

      grunt.task.run('gitcheckout:dev');
      grunt.task.run('gitpull:dev');
      grunt.task.run('gitcheckout:release');
      grunt.task.run('gitpull:release');
      grunt.task.run('gitmerge:dev');
      grunt.task.run('bump:' + bumpType);
      grunt.task.run('gitpush:release');
    }
    else if(releaseCmd === 'continue'){
      grunt.task.run('gitcheckout:release');
      grunt.task.run('bump:prerelease');
      grunt.task.run('gitpush:release');

    }
    else if(releaseCmd === 'finish'){

      // Skip useless ci build
      grunt.config.merge({
        bump: {
          options: {
            commitMessage: 'Release v%VERSION%\n\n[ci skip]'
          }
        }
      });


      grunt.task.run('gitcheckout:release');
      grunt.task.run('gitpull:release');
      grunt.task.run('gitcheckout:stable');
      grunt.task.run('gitpull:stable');
      grunt.task.run('gitmerge:releaseCiSkip');
      runBumpPatch();
      grunt.task.run('release:tag');
      grunt.task.run('gitpush:stable');
      grunt.task.run('gitcheckout:release');
      grunt.task.run('gitpull:release');
      grunt.task.run('gitmerge:stableCiSkip');
      grunt.task.run('gitpush:release');
      grunt.task.run('gitcheckout:dev');
      grunt.task.run('gitpull:dev');
      grunt.task.run('gitmerge:releaseCiSkip');
      grunt.task.run('gitpush:dev');
    }
    else if(releaseCmd === 'patch'){

      // Skip useless ci build
      grunt.config.merge({
        bump: {
          options: {
            commitMessage: 'Release v%VERSION%\n\n[ci skip]'
          }
        }
      });

      // Do a patch version on current stable/main

      grunt.task.run('gitcheckout:stable');
      grunt.task.run('gitpull:stable');
      runBumpPatch();
      grunt.task.run('release:tag');
      grunt.task.run('gitpush:stable');
      grunt.task.run('gitcheckout:release');
      grunt.task.run('gitpull:release');
      grunt.task.run('gitmerge:stableCiSkip');
      grunt.task.run('gitpush:release');
      grunt.task.run('gitcheckout:dev');
      grunt.task.run('gitpull:dev');
      grunt.task.run('gitmerge:releaseCiSkip');
      grunt.task.run('gitpush:dev');
    }
    else if(releaseCmd === 'finish-merge'){
      grunt.task.run('gitcheckout:release');
      grunt.task.run('gitpull:release');
      grunt.task.run('gitmerge:stableCiSkip');
      grunt.task.run('gitpush:release');
      grunt.task.run('gitcheckout:dev');
      grunt.task.run('gitpull:dev');
      grunt.task.run('gitmerge:releaseCiSkip');
      grunt.task.run('gitpush:dev');
    }
    else if(releaseCmd === 'tag'){

      version = null;
      grunt.file.read(options.versionFile).replace(VERSION_REGEXP, function(match, prefix, parsedVersion, suffix) {
        // Version should be increment here also because bump task did not run yet.
        version = parsedVersion;
      });

      if (!version) {
        grunt.fatal('Can not find a version in ' + options.versionFile);
      }

      execSync('git tag -a v' + version  + ' -m "Version ' + version + '"');

      grunt.log.ok('Tagged version : ' + version);
    }
    else if(releaseCmd === 'status'){

      // Count number of dev commits ahead of release branch
      const devRev = "origin/" + options.releaseBranch + "...origin/" + options.devBranch;
      const grep_pattern = '\'^(?!Merge branch \'"\'"\'' + options.releaseBranch + '\'"\'"\').+$\'';
      const devMatches = execSync("git rev-list --count --left-right " + devRev + ' --grep ' + grep_pattern + ' --perl-regexp').match(/\d+\t(\d+)/);
      const releaseAhead = (devMatches && devMatches[1] > 0);

      // Count number of release commits ahead of stable branch
      const releaseRev = "origin/" + options.stableBranch + "...origin/" + options.releaseBranch;
      const releaseMatches = execSync("git rev-list --count --left-right " + releaseRev).match(/\d+\t(\d+)/);
      const stableAhead = (releaseMatches && releaseMatches[1] > 0);

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

  grunt.registerTask('hotfix', 'Prepare a hotfix', function(hotfixCmd, hotfixName) {

    const options = this.options(DEFAULT_OPTIONS);
    let hotfixBranch;
    configureGitTasks(options);

    if (hotfixCmd === 'start') {


      if (typeof hotfixName == 'undefined'){
        grunt.fatal('hotfix name is required. (ex: grunt hotfix:start:fix-name)');
      }

      hotfixBranch = options.hotfixBranchPrefix + hotfixName;
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
    else if(hotfixCmd === 'finish'){

      if (typeof hotfixName == 'undefined'){
        grunt.fatal('hotfix name is required. (ex: grunt hotfix:finish:fix-name)');
      }

      hotfixBranch = options.hotfixBranchPrefix + hotfixName;
      grunt.log.writeln('Release hotfix branch : ' + hotfixBranch);

      const upstreamExists = (execSync('git ls-remote ' + options.remote + ' ' + hotfixBranch).trim() !== "");
      const hotfixMergeCiSkipMessage = 'Merge branch \'' + hotfixBranch + '\'\n\n[ci skip]';

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
              noff: true,
              message: hotfixMergeCiSkipMessage
            }
          }
        },
        bump: {
          options: {
            push: false,
            commitMessage: 'Release v%VERSION%\n\n[ci skip]'
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
      runBumpPatch();
      grunt.task.run('release:tag');
      grunt.task.run('gitpush:stable');

      //TODO: Delete hotfix branch. grunt-git does not support gitbranch task

      grunt.log.writeln('Don\'t forget to merge back ' + options.stableBranch + ' into ' + options.devBranch + '( or in ' + options.releaseBranch + ' if there is a release pending)');

    }
    else {
      grunt.fatal('Invalid hotfix command "' + hotfixCmd + '". Should be start|finish.');
    }

  });

  grunt.registerTask('feature', 'Prepare a feature', function(featureCmd, featureName) {

    const options = this.options(DEFAULT_OPTIONS);
    let featureBranch, featureDescr;
    configureGitTasks(options);

    if (featureCmd === 'start') {


      if (typeof featureName == 'undefined'){
        grunt.fatal('feature name is required. (ex: grunt feature:start:feature-name)');
      }

      featureBranch = options.featureBranchPrefix + featureName;
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
    else if(featureCmd === 'finish'){

      if (typeof featureName == 'undefined'){
        grunt.fatal('feature name is required. (ex: grunt feature:finish:feature-name)');
      }

      featureDescr = grunt.option('descr') || featureName;

      featureBranch = options.featureBranchPrefix + featureName;
      grunt.log.writeln('Release feature branch : ' + featureBranch);


      const upstreamExists = (execSync('git ls-remote ' + options.remote + ' ' + featureBranch).trim() !== "");

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
      grunt.fatal('Invalid hotfix command "' + featureCmd + '". Should be start|finish.');
    }

  });

  grunt.registerTask('upstream', 'Repackage upstream', function(repackCmd, upstreamVersion) {

    const options = this.options(DEFAULT_OPTIONS);
    let version;
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

    if(repackCmd === 'merge'){
      grunt.task.run('gitcheckout:dev');
      grunt.task.run('gitpull:dev');
      grunt.task.run('gitmerge:upstream');
      grunt.log.ok('please review upstream merge and commit to devBranch');
    }
    else if (repackCmd === 'pack') {

      if (typeof upstreamVersion == 'undefined') {
        grunt.fatal('upstream version to repack is required. (ex: grunt upstream:pack:2.1.4)');
      }

      version = grunt.file.readJSON(options.versionFile).version;

      if (typeof version == 'undefined'){
        grunt.fatal('Cannot find current version in ' + options.versionFile);
      }

      const newVersion = upstreamVersion + '-0';

      grunt.log.ok('Releasing master changes, changing version "' + version + '" to version "' + newVersion + '"' );

      grunt.task.run('gitcheckout:dev');
      execSync('grunt bump:pre --setversion=' + newVersion );
      grunt.task.run('gitpush:dev');
      grunt.task.run('upstream:release');
    }
    else if (repackCmd === 'repack'){
      grunt.task.run('gitcheckout:dev');
      grunt.task.run('gitpull:dev');
      grunt.task.run('bump:pre');
      grunt.task.run('gitpush:dev');
      grunt.task.run('upstream:release');
    }
    else if (repackCmd === 'release'){
      grunt.task.run('gitcheckout:release');
      grunt.task.run('gitpull:release');
      grunt.task.run('gitmerge:dev');
      grunt.task.run('upstream:tag');
      grunt.task.run('gitpush:release');
      grunt.task.run('gitcheckout:dev');

    }
    else if (repackCmd === 'stable'){
      grunt.task.run('gitcheckout:stable');
      grunt.task.run('gitpull:stable');
      grunt.task.run('gitmerge:release');
      grunt.task.run('gitpush:stable');
      grunt.task.run('gitcheckout:dev');
    }
    else if(repackCmd === 'tag'){

      version = null;
      grunt.file.read(options.versionFile).replace(VERSION_REGEXP, function(match, prefix, parsedVersion, suffix) {
        // Version should be increment here also because bump task did not run yet.
        version = parsedVersion;
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

};

// vim: set ts=2 sw=2 sts=2 et :
