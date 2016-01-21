var _ = require('underscore'),
    express = require('express'),
    moment = require('moment'),
    request = require('request').defaults({ encoding: null }),
    pdfText = require('pdf-text');

if (process.env.REDISTOGO_URL) {
  var rtg   = require('url').parse(process.env.REDISTOGO_URL),
      client = require('redis').createClient(rtg.port, rtg.hostname);
  client.auth(rtg.auth.split(':')[1]);
} else {
  var client = require('redis').createClient();
}

var _page_re = /\d+?\saf\s\d+/i,
    _email_re = /.*@crossfitcopenhagen.dk/i,
    _footer_re = /Uklarheder.*/i,
    _date_re = /(\d+)\.\s(\w+)/i,
    _header_re = /WOD kalender .*/;


function _isContent(item) {
  return !_page_re.test(item) &&
         !_email_re.test(item) &&
         !_header_re.test(item) &&
         !_footer_re.test(item);
}

module.exports = {
  parseWodPdf: function (input, callback) {
    var data = {};
    pdfText(input, function (err, chunks) {
      moment.locale('da');
      if (err) {
        return callback(err);
      }

      var key;
      _.forEach(chunks, function(item) {
        if (_isContent(item)) {
          var date = moment(item);
          if (date.isValid() && _date_re.test(item)) {
            key = date.toISOString();
            data[key] = [];
          }
          if (data.hasOwnProperty(key)) {
            if (!_date_re.test(item)) {
              data[key].push(item);
            }
          }
        }
      });
      moment.locale('en');
      return callback(err, data);
    });
  },
  downloadPdf: function (link, callback) {
    request.get(link, function (err, res, body) {
      if (err) {
        return callback(err);
      }

      if (res.statusCode === 200) {
        return callback(null, res);
      } else {
        return callback(err, res);
      }
    }.bind(this));
  },
  saveWodList: function (wods, callback) {
    var multiClient = client.multi();
    _.each(wods, function (value, key) {
      _.each(value, function (item, index) {
        multiClient.zadd('wod:' + key, index, item);
      });
    });
    multiClient.exec(function (err, results) {
      if (err) {
        console.log(err);
      }
      callback(err, _.countBy(results, _.identity));
    });
  },
  getWod: function (key, callback) {
    client.zrange('wod:' + key, 0, -1, function (err, res) {
      if (err) {
        return callback(err);
      }
      return callback(null, res);
    });
  },
  wipeWodList: function (callback) {
    client.keys('wod:*', function (err, keys) {
      if (err) {
        return callback(err);
      } else if (keys.length === 0) {
        return callback(null, 0);
      }
      client.del(keys, function (err, res){
        if (err) {
          return callback(err);
        }
        console.log(res);
        return callback(null, res);
      });
    });
  },
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
}
