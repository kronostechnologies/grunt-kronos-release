// vim: set ts=2 sw=2 sts=2 et :

module.exports = function(grunt) {
  
  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
    release: {
      options: {
      }
    },

		jshint: {
      options: {
        node:true
      },
      task: [
        "Gruntfile.js",
        "tasks/**/*.js",
      ]
    }
  });

  grunt.registerTask('default', [
    'jshint:task'
  ]);


};
