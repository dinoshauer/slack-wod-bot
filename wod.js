var _ = require('underscore'),
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

function _parseWod (wod) {
  var pattern = /^[A-Z]\. /,
      result = {},
      lastMatch;
  wod.forEach(function (item, index) {
    var matches = item.match(pattern);
    if (matches) {
      lastMatch = matches[0];
      result[matches[0]] = [item.replace(pattern, '')]
    } else if (lastMatch) {
      result[lastMatch] = result[lastMatch].concat(item);
    }
  });
  return result;
};

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
          var date = moment(item).locale('da');
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
  },
  presentWod: function (target, wodList) {
    var wod = _parseWod(wodList),
        wodStr = 'Wod for ' + target.format('dddd YYYY-MM-DD') + ':\n';

    _.forEach(wod, function (value, key) {
      wodStr += '*' + key + '*:\n';
      value.forEach(function (item) {
        if (item) {
          wodStr += '  - ' + item + '\n';
        }
      });
    });
    return wodStr;
  },
  replyWithWod: function (target, bot, message, day) {
    this.getWod(target.toISOString(), function (err, res) {
      if (err) {
        console.log(err);
        bot.reply('I couldn\'t get a wod for ' + day + ' :(');
      }
      if (res.length !== 0) {
        bot.reply(message, this.presentWod(target, res));
      } else {
        bot.reply(message, 'There are no wods for ' + day + ' in my head :o');
      }
    }.bind(this));
  }
};
