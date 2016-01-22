var Botkit = require('botkit'),
    moment = require('moment'),
    utils = require('./utils');

require('moment-range');

if (!process.env.SLACK_API_KEY) {
  console.log('Error: Specify SLACK_API_KEY in environment');
  process.exit(1);
}

if (!process.env.HEROKU_URL) {
  console.log('Warning: Running without keepalive');
} else {
  utils.keepAlive(process.env.HEROKU_URL);
}

var controller = Botkit.slackbot(),
    bot = controller.spawn({
      token: process.env.SLACK_API_KEY
    });

bot.startRTM(function (err, bot, payload) {
  if (err) {
    throw new Error('Could not connect to Slack');
  }
});

controller.hears(
  ['wipe wod list'],
  ['direct_message', 'direct_mention', 'mention'],
  function (bot, message) {
    console.log(message);

    bot.startConversation(message, function (error, convo) {
      convo.ask('Are you sure? Answer with "yes", "no"', [
        {
          pattern: bot.utterances.yes,
          callback: function(response, convo) {
            convo.say('I won\'t remember a thing!');
            utils.wipeWodList(function (err, res) {
              if (err) {
                console.log(err);
                convo.say('I couldn\'t wipe the list :(');
                convo.next();
              } else {
                convo.say('I forgot ' + res + ' WODs... :robot_face:');
                convo.next();
              }
            });
          }
        },
        {
          pattern: bot.utterances.no,
          callback: function(response, convo) {
            convo.say('Cool. I\'ll leave it for now :)');
            convo.next();
          }
        }
      ]);
    });

});

controller.hears(
  ['new wod list here: <(.*)>'],
  ['direct_message', 'direct_mention', 'mention', 'ambient'],
  function (bot, message) {
    bot.startConversation(message, function (error, convo) {
      convo.sayFirst('Great! I\'m going to download the list @ ' + message.match[1]);
      utils.downloadPdf(message.match[1], function (err, res) {
        if (err) {
          console.error('error!', err.statusCode);
          convo.say('Something happened when downloading the list :(');
          convo.stop();
        }
        console.log('Downloaded new list', res.statusCode);
        convo.say('List downloaded. Parsing. Meep, morp... Zorp.')
        utils.parseWodPdf(res.body, function (err, wods) {
          if (err) {
            console.error('error!', err);
            convo.say('Something bad happened when parsing the pdf! :<');
            convo.stop();
          }
          console.log('Parsed list');
          convo.say('I totally parsed that list! I\'ll try and save it now');
          utils.saveWodList(wods, function (err, results) {
            if (err) {
              console.error('error!', err);
              convo.say('I couldn\'t save the list to memory!');
              convo.stop();
            }
            console.log('List saved.')
            convo.say('Everything is great! I saved the list!');
          });
        });
      });
    });
});

controller.hears(
  ['wod today\??'],
  ['direct_message', 'direct_mention', 'mention', 'ambient'],
  function (bot, message) {
    var start = moment().startOf('day'),
        target = start.toISOString();
    console.log(message);

    utils.getWod(target, function (err, res) {
      if (err) {
        console.log(err);
        bot.reply('I couldn\'t get a wod for today :(');
      }
      if (res.length !== 0) {
        bot.reply(message, res.join('\n'));
      } else {
        bot.reply(message, 'There are no wods for today in my head :o');
      }
    });
});

controller.hears(
  ['wod tomorrow\??'],
  ['direct_message', 'direct_mention', 'mention', 'ambient'],
  function (bot, message) {
    var start = moment().startOf('day'),
        target = start.add(1, 'day').toISOString();
    console.log(message);

    utils.getWod(target, function (err, res) {
      if (err) {
        console.log(err);
        bot.reply('I couldn\'t get a wod for tomorrow :(');
      }
      if (res.length !== 0) {
        bot.reply(message, res.join('\n'));
      } else {
        bot.reply(message, 'There are no wods for tomorrow in my head :o');
      }
    });
});

controller.hears(
  ['wod yesterday\??'],
  ['direct_message', 'direct_mention', 'mention', 'ambient'],
  function (bot, message) {
    var start = moment().startOf('day'),
        target = start.subtract(1, 'day').toISOString();
    console.log(message);

    utils.getWod(target, function (err, res) {
      if (err) {
        console.log(err);
        bot.reply('I couldn\'t get a wod for yesterday :(');
      }
      if (res.length !== 0) {
        bot.reply(message, res.join('\n'));
      } else {
        bot.reply(message, 'There are no wods for yesterday in my head :o');
      }
    });
});

controller.hears(
  ['wod (mon|tues|wednes|thurs|fri|satur|sun)day\??'],
  ['direct_message', 'direct_mention', 'mention', 'ambient'],
  function (bot, message) {
    var start = moment().startOf('day'),
        target = start.day(message.match[1]).toISOString();
    console.log(message);

    utils.getWod(target, function (err, res) {
      if (err) {
        console.log(err);
        bot.reply('I couldn\'t get a wod for ' + message.match[1] + 'day :(');
      }
      if (res.length !== 0) {
        bot.reply(message, res.join('\n'));
      } else {
        bot.reply(message, 'There are no wods for ' + message.match[1] + 'day in my head :o');
      }
    });
});

controller.hears(
  ['wod next (mon|tues|wednes|thurs|fri|satur|sun)day\??'],
  ['direct_message', 'direct_mention', 'mention', 'ambient'],
  function (bot, message) {
    var start = moment().startOf('day').add(1, 'week'),
        target = start.day(message.match[1]).toISOString();
    console.log(message);

    utils.getWod(target, function (err, res) {
      if (err) {
        console.log(err);
        bot.reply('I couldn\'t get a wod for next ' + message.match[1] + 'day :(');
      }
      if (res.length !== 0) {
        bot.reply(message, res.join('\n'));
      } else {
        bot.reply(message, 'There are no wods for next ' + message.match[1] + 'day in my head :o');
      }
    });
});

controller.hears(
  ['wods next week\??'],
  ['direct_message', 'direct_mention', 'mention', 'ambient'],
  function (bot, message) {
    var start = moment().add(1, 'week').startOf('week'),
        end = moment().add(1, 'week').endOf('week'),
        targets = moment.range(start, end);
    console.log(message);

    targets.by('days', function (target) {
      utils.getWod(target.toISOString(), function (err, res) {
        if (err) {
          console.log(err);
          bot.reply('I couldn\'t get a wod for next week :(');
        }
        if (res.length !== 0) {
          bot.reply(message, '*' + target.toISOString() + '*\n' + res.join('\n'));
        } else {
          bot.reply(message, 'There are no wods for next week in my head :o');
        }
      });
    });
});
