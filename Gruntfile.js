// vim: set ts=2 sw=2 sts=2 et :


module.exports = function(grunt) {
  grunt.initConfig({
    release: {
      options: {
      }
    }
  });

  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

};
