import _ from 'underscore';
import moment from 'moment';
import request from 'request-promise';
import pdfText from 'pdf-text';
import url from 'url';
import { createClient } from 'redis';

const _getClient = () => {
  if (process.env.REDISTOGO_URL) {
    const rtg   = url.parse(process.env.REDISTOGO_URL);
    let client = createClient(rtg.port, rtg.hostname);
    client.auth(rtg.auth.split(':')[1]);
    return client;
  } else {
    return createClient();
  }
}

const client = _getClient();

const _page_re = /\d+?\saf\s\d+/i;
const _email_re = /.*@crossfitcopenhagen.dk/i;
const _footer_re = /Uklarheder.*/i;
const _date_re = /(\d+)\.\s(\w+)/i;
const _header_re = /WOD kalender .*/;

const _isContent = (item) => {
  return !_page_re.test(item) &&
         !_email_re.test(item) &&
         !_header_re.test(item) &&
         !_footer_re.test(item);
}

const _parseWod = (wod) => {
  const pattern = /^[A-Z]\. /;
  let result = {},
      lastMatch;

  wod.forEach(function (item, index) {
    const matches = item.match(pattern);
    if (matches) {
      lastMatch = matches[0];
      result[matches[0]] = [item.replace(pattern, '')]
    } else if (lastMatch) {
      result[lastMatch] = result[lastMatch].concat(item);
    }
  });
  return result;
};

const _downloadPdf = (link) => request({
  url: link,
  encoding: null
});

const _parseWodPdf = (input) => {
  return new Promise( (resolve, reject) => {
    let data = {};
    pdfText(input, (err, chunks) => {
      if (err) {
        reject(err);
      }
      let key;
      chunks.forEach( item => {
        if (_isContent(item)) {
          var date = moment(item, 'dddd den DD. MMMM YY').locale('da');
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
      resolve(data);
    });
  });
};

const _saveWodList = (wods) => {
  return new Promise( (resolve, reject) => {
    const multiClient = client.multi();
    Object.keys(wods).forEach( key => {
      wods[key].forEach( (value, index) => {
        multiClient.zadd(`wod:${key}`, index, value);
      });
    });
    multiClient.exec( (err, res) => {
      return err ? reject(err) : resolve(_.countBy(res, _.identity));
    });
  });
}

export const getNewWodList = (link) => (
  _downloadPdf(link)
    .then( data => {
      console.log('Got the data, parsing')
      return _parseWodPdf(data);
    })
    .then( wods => {
      console.log('Parsed the data, saving')
      return _saveWodList(wods);
    })
);

export const getWod = (key, callback) => {
  client.zrange('wod:' + key, 0, -1, (err, res) => {
    if (err) {
      return callback(err);
    }
    return callback(null, res);
  });
};

export const wipeWodList = (callback) => {
  client.keys('wod:*', (err, keys) => {
    if (err) {
      return callback(err);
    } else if (keys.length === 0) {
      return callback(null, 0);
    }
    client.del(keys, (err, res) => {
      if (err) {
        return callback(err);
      }
      console.log(res);
      return callback(null, res);
    });
  });
};

export const presentWod = (target, wodList) => {
  const wod = _parseWod(wodList);
  const targetStr = target.format('dddd YYYY-MM-DD');
  let wodStr = `Wod for ${targetStr}:\n`;

  _.forEach(wod, (value, key) => {
    wodStr += `*${key}*:\n`;
    value.forEach((item) => item ? wodStr += `  - ${item}\n` : '');
  });
  return wodStr;
};

export const replyWithWod = (target, bot, message, day) => {
  getWod(target.toISOString(), (err, res) => {
    if (err) {
      console.log(err);
      bot.reply(`I couldn\'t get a wod for ${day} :(`);
    }
    if (res.length !== 0) {
      bot.reply(message, this.presentWod(target, res));
    } else {
      bot.reply(message, `There are no wods for ${day} in my head :o`);
    }
  });
};
