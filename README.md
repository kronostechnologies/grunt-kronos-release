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
In your project's Gruntfile, add a section named `bump` to the data object passed into `grunt.initConfig()`. The options (and defaults) are:

```js
grunt.initConfig({
  kronos-release: {
    options: {
    }
  },
})
```

### Options

#### options.dev-branch
Type: `String`
Default value: `master`

Dev branch name

#### options.release-branch
Type: `String`
Default value: `release/main`

Release branch name

#### options.stable-branch
Type: `String`
Default value: `stable/main`

Stable branch name


### Usage Examples

#### Stage project for release into FNCT environment

```
grunt release:start:minor
grunt release:start:major
grunt release:start:patch
```
 
#### Release project stable version

```
grunt release:finish
```

#### Release hotfix version

```
grunt hotfix:start --branch=hotifx/branch-name
grunt hotfix:finish --branch=hotifx/branch-name
```
