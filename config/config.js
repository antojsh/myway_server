var path = require('path'),
    rootPath = path.normalize(__dirname + '/..'),
    env = process.env.NODE_ENV || 'development';

var config = {
  development: {
    root: rootPath,
    app: {
      name: 'mibus-server'
    },
    port: process.env.PORT || 3000,
    db: 'mongodb://localhost/mibus-server-development'
  },

  test: {
    root: rootPath,
    app: {
      name: 'mibus-server'
    },
    port: process.env.PORT || 3000,
    db: 'mongodb://localhost/mibus-server-test'
  },

  production: {
    root: rootPath,
    app: {
      name: 'mibus-server'
    },
    port: process.env.PORT || 3000,
    db: 'mongodb://localhost/mibus-server-production'
  }
};

module.exports = config[env];
