var express = require('express'),
    request = require('request');

module.exports = {
  keepAlive: function (baseUrl) {
    var web = express();

    web.get('/ping', function (req, res) {
      console.log('Responding to PING');
      res.send('PONG');
    });

    web.listen(process.env.PORT || 8080, function () {
      console.log('Web server started!');
    });

    setInterval(function () {
      request.get(baseUrl + '/ping');
    }, 60000);
  }
};
