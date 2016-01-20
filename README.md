Bort Woddington
===============

This slack bot is built using [BotKit][0].

It's purpose is to parse `pdf` files supplied by [CrossFit Copenhagen][1] and
respond to requests.

Requirements:

* redis to save the wod list into.
* `SLACK_API_KEY` environment variable.

Currently listening for these patterns:

* `new wod list here: <(.*)>`
* `wipe wod list`
* `wod today`
* `wod yesterday`
* `wod tomorrow`

[0]: http://howdy.ai/botkit/
[1]: http://crossfitcopenhagen.dk
