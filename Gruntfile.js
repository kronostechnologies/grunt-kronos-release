// vim: set ts=2 sw=2 sts=2 et :


module.exports = function(grunt) {
  grunt.initConfig({
    'bump': {
      options: {
        files: ['package.json'],
        commitFiles: ['package.json'],
        push: true,
        pushTo: 'origin',
        createTag: true
      }
    }
  });

  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

};
