module.exports = function (io) {
  var Application = require('../models/application');
  var router = require('express').Router();

  var socket;

  io && io.sockets.on('connection', function (aSocket) {
    socket = aSocket;
  });

  router.get('/', function(req, res) {
    Application.find().sort({name: 1}).exec(function (err, apps) {
      if(apps.length > 0) {
        res.render('partials/index', {
          apps: apps
        });
      }
      else {
        res.redirect('/partials/new');
      }
    });
  });

  router.post('/requests/:app_key', function(req, res) {
    var appKey = req.params.app_key;
    var data = req.body.request;

    if(!data) {
      res.send('Incorrect data.')
      return;
    }
    if(data.endpoint === undefined || data.success === undefined) {
      res.send('Incorrect data.')
      return;
    }

    Application.findOne({key: appKey}, function (err, app) {
      if(!app || err) {
        res.send('Invalid application key. Please make sure the given key is correct.');
        return;
      }

      var environment = data.environment || 'Default';

      app.requests = app.requests || {};
      app.requests[environment] = app.requests[environment] || {};
      app.requests[environment][data.endpoint] = app.requests[environment][data.endpoint] || [];

      var newRequest = {
        success: toBool(data.success),
        date: new Date()
      };
      app.requests[environment][data.endpoint].push(newRequest);

      socket && socket.emit('newRequest', {
        appName: app.name,
        environment: environment,
        endpoint: data.endpoint,
        request: newRequest
      });

      Application.update({key: appKey}, {requests: app.requests}, function (err, numberAffected, raw) {
        res.send('Success');
      });
    });
  });

  router.get('/applications/new', function (req, res) {
    res.render('partials/new');
  });

  router.post('/applications/new', function (req, res) {
    new Application(req.body.application).save(function (err, app) {
      if(err) {
        res.render('partials/new', {
          application: req.body.application,
          error: err
        });
      }

      res.redirect('/');
    });
  });

  function toBool(value) {
    if(typeof value === 'string') {
      if(value === 'true') return true;
      else if(value === 'false') return false;
    }

    return value;
  }

  return router;
};