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
    db: 'mongodb://antojsh:antonio199308JSH@ds129183.mlab.com:29183/myway'
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
