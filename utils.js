var _ = require('underscore'),
    moment = require('moment'),
    request = require('request').defaults({ encoding: null }),
    pdfText = require('pdf-text');
var redis = require("redis"),
    client = redis.createClient();

var _page_re = /\d+?\saf\s\d+/i,
    _email_re = /.*@crossfitcopenhagen.dk/i,
    _footer_re = /Uklarheder.*/i,
    _date_re = /(\d+)\.\s(\w+)/i,
    _header_re = /WOD kalender .*/;


moment.locale('da');

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
  }
}
