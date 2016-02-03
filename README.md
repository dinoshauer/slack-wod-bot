Bort Woddington
===============

This slack bot is built using [BotKit][0].

It's purpose is to parse `pdf` files supplied by [CrossFit Copenhagen][1] and
respond to requests.

## Requirements:

* redis to save the wod list into.
* `SLACK_API_KEY` environment variable.
* `HEROKU_URL` (optional) - If supplied an express web server will be created
  at launch and the bot will ping the webserver every 60 seconds, as to keep
  itself alive on heroku

## Currently listening for these patterns:

### Wods

* `new wod list here: <(.*)>`
* `wipe wod list`
* `wod today`
* `wod yesterday`
* `wod tomorrow`
* `wod (mon|tues|wednes|thurs|fri|satur|sun)day\??`
* `wod next (mon|tues|wednes|thurs|fri|satur|sun)day\??`
* `wods next week\??`

### Booking

* `/(\w*) in (.+) (tomorrow|.*day) (?:(\d+)-(\d+))/`

## Todo:

* [ ] ES6
* [x] DRYer replies

[0]: http://howdy.ai/botkit/
[1]: http://crossfitcopenhagen.dk
