# grunt-kronos-release

> Manage release flow for Kronos Technologies applications

## Getting Started
This plugin requires Grunt.

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-kronos-release --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-kronos-release');
```

### Configuration
In your project's Gruntfile, add a section named `release` to the data object passed into `grunt.initConfig()`.  The options (and defaults) are:

```js
grunt.initConfig({
  release: {
    options: {
      devBranch: 'master',
      releaseBranch: 'release/main',
      stableBranch: 'stable/main',
      hotfixBranchPrefix: 'hotfix/',
      remote: 'origin',
      versionFile: 'package.json'
    }
  },
})
```

grunt-bump must be configured not to tag.

```js
bump: {
  options: {
    files: ['package.json', 'bower.json'],
    commitFiles: ['package.json', 'bower.json', 'CHANGELOG.md'],
    push: true,
    pushTo: 'origin',
    createTag: false 
  }
}
```

grunt-git and grunt-changelog should be installed in your project.

### Options

#### options.devBranch
Type: `String`
Default value: `master`

Dev branch name

#### options.releaseBranch
Type: `String`
Default value: `release/main`

Release branch name

#### options.stableBranch
Type: `String`
Default value: `stable/main`

Stable branch name


### Usage Examples

#### Prepare new release to be packaged

To prepare a new release, code from development branch (master) is merged into release/main branch.  By default, version is incremented to a minor pre-release (0.X.0-1).  Major pre-release (X.0.0-1) can also be achieved.

Code from `release/main` will be build by jenkins and installed in FNCT environment.


```
# Start a minor (1.X.0-1) version.
grunt release:start # or grunt release:start:minor

# Start a major (X.0.0-1) version.
grunt release:start:major
```

#### Do some fix for next release

During the stabilization period for the next release, fixes should be done in the `release/main` branch. Commits can be cherry-picked from master or new commit can be done directly on release/main.

During the stabilization process, merging `master` should be avoided. If it is absolutely necessary, you should keep the `release/main` version in package.json and bower.json when resolving merge conflict. 

Keep in mind that the code should be feature complete before starting a new release.  Stabilization should be done in the release branch. *Don’t do dev in FNCT.*


```
# Increment prerelease version (0.0.0-X)
grunt release:continue
```

 
#### Release the next version to production

During this step, we set the final version for next release and merge `release/main` into `stable/main`.  The version v1.X.0 will be done on `stable/main` branch.

Code from `stable/main` will be build by jenkins and installed in PROD environment.

Finally, `release/main` will also be meged into `master` to bring back stabilization fixes, version update and changelog for next release.


```
# Remove pre-release version, generate changelog,  merge into stable/main and tag final version.
grunt release:finish
```

#### Doing hotfix for production

Fixes in production production must be prepared in a `hotfix/hotifx-name` branch that branch from the `stable/main` branch.

The grunt `hotfix:start:fix-name` task create a new hotfix branch.  The grunt `hotfix:finish:fix-name` task increment the patch version and merge the hotfix branch into `release/main`.

The fix can be cherry-picked from `master` or `release/main` (with care) or committed directly to the hotfix branch.  Backport the fix for the next release will be explained in a further section.


```
# Start a new hotfix branch
grunt hotfix:start:fix-name

# Increment patch version, update changelog, merge into stable/main and tag final version.
grunt hotfix:finish:fix-name
```

#### Bring back hotfix changes if there is no release started.

When there is no release in stabilization process in release/main,  the stable/main branch can simply be mege into master after the hotfix.

```
git checkout master
git merge --no-ff stable/main # Should not conflict
```

#### Bring back hotfix changes hen a release is already started.

```
git checkout release/main
git merge --no-ff stable/main
# package.json and bower.json will conflict due to the version change in both branch.
git checkout -f origin/release/main -- package.json bower.json # Keep release/main version
grunt:release:contiue # Increment pre-release
```

