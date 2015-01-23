/**
 * This is the file where commands get parsed
 *
 * Some parts of this code are taken from the Pokémon Showdown server code, so
 * credits also go to Guangcong Luo and other Pokémon Showdown contributors.
 * https://github.com/Zarel/Pokemon-Showdown
 *
 * @license MIT license
 */

var sys = require('sys');
var http = require('http');
var https = require('https');
var url = require('url');
var sizeOf = require('image-size');

const ACTION_COOLDOWN = 3*1000;
const FLOOD_MESSAGE_NUM = 5;
const FLOOD_PER_MSG_MIN = 500; // this is the minimum time between messages for legitimate spam. It's used to determine what "flooding" is caused by lag
const FLOOD_MESSAGE_TIME = 6*1000;
const MIN_CAPS_LENGTH = 18;
const MIN_CAPS_PROPORTION = 0.8;


settings = {};
try {
	settings = JSON.parse(fs.readFileSync('settings.json'));
	if (!Object.keys(settings).length && settings !== {}) settings = {};
} catch (e) {} // file doesn't exist [yet]

messages = {};
try {
	messages = JSON.parse(fs.readFileSync('messages.json'));
	if (!Object.keys(messages).length && messages !== {}) messages = {};
} catch (e) {} // file doesn't exist [yet]

exports.parse = {
	actionUrl: url.parse('https://play.pokemonshowdown.com/~~' + config.serverid + '/action.php'),
	room: 'lobby',
	'settings': settings,
	'messages': messages,
	chatData: {},
	ranks: {},
	RP: {},

	data: function(data, connection) {
		if (data.substr(0, 1) === 'a') {
			data = JSON.parse(data.substr(1));
			if (data instanceof Array) {
				for (var i = 0; i < data.length; i++) {
					this.message(data[i], connection);
				}
			} else {
				this.message(data, connection);
			}
		}
	},
	message: function(message, connection) {
		if (!message) return;

		if (message.indexOf('\n') > -1) {
			var spl = message.split('\n');
			for (var i = 0; i < spl.length; i++) {
				if (spl[i].split('|')[1] && (spl[i].split('|')[1] === 'init' || spl[i].split('|')[1] === 'tournament')) {
					this.room = '';
					break;
				}
				this.message(spl[i], connection);
			}
			return;
		}

		var spl = message.split('|');
		if (!spl[1]) {
			spl = spl[0].split('>');
			if (spl[1]) this.room = spl[1];
			return;
		}

		switch (spl[1]) {
			case 'challstr':
				info('received challstr, logging in...');
				var id = spl[2];
				var str = spl[3];

				var requestOptions = {
					hostname: this.actionUrl.hostname,
					port: this.actionUrl.port,
					path: this.actionUrl.pathname,
					agent: false
				};

				if (!config.pass) {
					requestOptions.method = 'GET';
					requestOptions.path += '?act=getassertion&userid=' + toId(config.nick) + '&challengekeyid=' + id + '&challenge=' + str;
				} else {
					requestOptions.method = 'POST';
					var data = 'act=login&name=' + config.nick + '&pass=' + config.pass + '&challengekeyid=' + id + '&challenge=' + str;
					requestOptions.headers = {
						'Content-Type': 'application/x-www-form-urlencoded',
						'Content-Length': data.length
					};
				}

				var req = https.request(requestOptions, function(res) {
					res.setEncoding('utf8');
					var data = '';
					res.on('data', function(chunk) {
						data += chunk;
					});
					res.on('end', function() {
						if (data === ';') {
							error('failed to log in; nick is registered - invalid or no password given');
							process.exit(-1);
						}
						if (data.length < 50) {
							error('failed to log in: ' + data);
							process.exit(-1);
						}

						if (data.indexOf('heavy load') !== -1) {
							error('the login server is under heavy load; trying again in one minute');
							setTimeout(function() {
								this.message(message);
							}.bind(this), 60000);
							return;
						}

						try {
							data = JSON.parse(data.substr(1));
							if (data.actionsuccess) {
								data = data.assertion;
							} else {
								error('could not log in; action was not successful: ' + JSON.stringify(data));
								process.exit(-1);
							}
						} catch (e) {}
						send(connection, '|/trn ' + config.nick + ',0,' + data);
					}.bind(this));
				}.bind(this));
				
				req.on('error', function(err) {
					error('login error: ' + sys.inspect(err));
				});
				
				if (data) {
					req.write(data);
				}
				req.end();
				break;
			case 'updateuser':
				if (spl[2] !== config.nick) {
					return;
				}

				if (spl[3] !== '1') {
					error('failed to log in, still guest');
					process.exit(-1);
				}

				ok('We\'re in as ' + spl[2]);

				// Now join the rooms
				var cmds = ['|/idle'];
				for (var i in config.rooms) {
					var room = toId(config.rooms[i]);
					if (room === 'lobby' && config.serverid === 'showdown') {
						continue;
					}
					cmds.push('|/join ' + room);
					cmds.push('|/avatar ' + config.avatarNumber);
				}
				for (var i in config.privaterooms) {
					var room = toId(config.privaterooms[i]);
					if (room === 'lobby' && config.serverid === 'showdown') {
						continue;
					}
					cmds.push('|/join ' + room);
					cmds.push('|/avatar ' + config.avatarNumber);
				}
				if (config.serverid === 'showdown') {
					this.RP.void = {};
					for (var i = 0; i < config.artrooms.length; i++) {
						this.RP[toId(config.artrooms[i])] = {};
						this.RP.void[toId(config.artrooms[i])] = [];
					}
					this.amphyVoices = [];
				} else {
					for (var i = 0; i < config.artrooms.length; i++) {
						this.RP[toId(config.artrooms[i])] = {};
					}
				}
				
				var self = this;
				if (cmds.length > 4) {
					self.nextJoin = 0;
					self.joinSpacer = setInterval(function(con, cmds) {
						if (cmds.length > self.nextJoin + 3) {
							send(con, cmds.slice(self.nextJoin, self.nextJoin + 3));
							self.nextJoin += 3;
						} else {
							send(con, cmds.slice(self.nextJoin));
							delete self.nextJoin;
							clearInterval(self.joinSpacer);
						}
					}, 4*1000, connection, cmds);
				} else {
					send(connection, cmds);
				}

				this.chatDataTimer = setInterval(
					function() {self.chatData = cleanChatData(self.chatData);},
					30*60*1000
				);
				this.room = '';
				break;
			case 'title':
				ok('joined ' + spl[2]);
				this.room = '';
				break;
			case 'c':
				var by = spl[2];
				spl.splice(0, 3);
				this.processChatData(by, this.room || 'lobby', connection, spl.join('|'));
				if (this.room && this.isBlacklisted(toId(by), this.room)) this.say(connection, this.room, '/roomban ' + by + ', Blacklisted user');
				this.chatMessage(spl.join('|'), by, this.room || 'lobby', connection);
				this.room = '';
				break;
			case 'c:':
				var by = spl[3];
				spl.splice(0, 4);
				this.processChatData(by, this.room || 'lobby', connection, spl.join('|'));
				if (this.room && this.isBlacklisted(toId(by), this.room)) this.say(connection, this.room, '/roomban ' + by + ', Blacklisted user');
				this.chatMessage(spl.join('|'), by, this.room || 'lobby', connection);
				this.room = '';
				break;
			case 'pm':
				var by = spl[2];
				if (by.substr(1) === config.nick) return;
				spl.splice(0, 4);
				this.chatMessage(spl.join('|'), by, ',' + by, connection);
				this.room = '';
				break;
			case 'N':
				var by = spl[2];
				this.updateSeen(spl[3], spl[1], by);
				//Send pending mail
				if (this.room && this.sendMail([toId(by)], this.room)) {
					for (var msgNumber in this.messages[toId(by)]) {
						if (msgNumber === 'timestamp') continue;
						this.say(connection, this.room, '/msg ' + by + ', ' + this.messages[toId(by)][msgNumber]);
					}
					delete this.messages[toId(by)];
					this.writeMessages();
				}
				if (typeof this.amphyVoices !== 'undefined') {
					if (toId(by) === spl[3] && by.charAt(0) === '+' && this.amphyVoices.indexOf(spl[3]) === -1) this.amphyVoices.push(spl[3]);
				}
				if (toId(by) !== toId(config.nick) || ' +%@&#~'.indexOf(by.charAt(0)) === -1) return;
				this.ranks[toId(this.room === '' ? 'lobby' : this.room)] = by.charAt(0);
				this.room = '';
				break;
			case 'J': case 'j':
				var by = spl[2];
				if (this.room && this.isBlacklisted(toId(by), this.room)) this.say(connection, this.room, '/roomban ' + by + ', Blacklisted user');
				this.updateSeen(by, spl[1], (this.room === '' ? 'lobby' : this.room));
				//Send pending mail
				if (this.room && this.sendMail([toId(by)], this.room)) {
					for (var msgNumber in this.messages[toId(by)]) {
						if (msgNumber === 'timestamp') continue;
						this.say(connection, this.room, '/msg ' + by + ', ' + this.messages[toId(by)][msgNumber]);
					}
					delete this.messages[toId(by)];
					this.writeMessages();
				}
				if (toId(by) !== toId(config.nick) || ' +%@&#~'.indexOf(by.charAt(0)) === -1) return;
				this.ranks[toId(this.room === '' ? 'lobby' : this.room)] = by.charAt(0);
				this.room = '';
				break;
			case 'l': case 'L':
				var by = spl[2];
				this.updateSeen(by, spl[1], (this.room === '' ? 'lobby' : this.room));
				this.room = '';
				break;
			case 'raw':
				//This section does nothing at the moment, but might be utilized in the future.
				var position = spl[1].indexOf('<a href="http://psartroom.weebly.com/current-requests.html">')
				if (position > -1) {
					console.log('Current request count is: ' + spl[1].charAt(position + 64));
				}
				if (spl[1].indexOf('<!--intro ') > -1) {
					console.log('is roomintro!');
					var introNum = spl[1].substr(spl[1].lastIndexOf('<!--intro ')+1,spl[1].lastIndexOf('-->'));
					
				}
				break;
		}
	},
	chatMessage: function(message, by, room, connection) {
		var cmdrMessage = '["' + room + '|' + by + '|' + message + '"]';
		message = message.trim();
		// auto accept invitations to rooms
		if (room.charAt(0) === ',' && message.substr(0,8) === '/invite ' && this.hasRank(by, '%@&~') && !(config.serverid === 'showdown' && toId(message.substr(8)) === 'lobby')) {
			this.say(connection, '', '/join ' + message.substr(8));
		}
		if (message.substr(0, config.commandcharacter.length) !== config.commandcharacter || toId(by) === toId(config.nick)) {
			return;
		}

		message = message.substr(config.commandcharacter.length);
		var index = message.indexOf(' ');
		var arg = '';
		if (index > -1) {
			var cmd = message.substr(0, index);
			arg = message.substr(index + 1).trim();
		} else {
			var cmd = message.toLowerCase();
		}

		if (Commands[cmd]) {
			var failsafe = 0;
			while (typeof Commands[cmd] !== "function" && failsafe++ < 10) {
				cmd = Commands[cmd];
			}
			if (typeof Commands[cmd] === "function") {
				cmdr(cmdrMessage);
				Commands[cmd].call(this, arg, by, room, connection);
			} else {
				error("invalid command type for " + cmd + ": " + (typeof Commands[cmd]));
			}
		}
	},
	say: function(connection, room, text) {
		if (room.substr(0, 1) !== ',') {
			var str = (room !== 'lobby' ? room : '') + '|' + text;
			send(connection, str);
		} else {
			room = room.substr(1);
			var str = '|/pm ' + room + ', ' + text;
			send(connection, str);
		}
	},
	hasRank: function(user, rank) {
		var hasRank = (rank.split('').indexOf(user.charAt(0)) !== -1) || (config.excepts.indexOf(toId(user.substr(1))) !== -1);
		return hasRank;
	},
	canUse: function(cmd, room, user) {
		var canUse = false;
		var ranks = ' +%@&#~';
		if (!this.settings[cmd] || !(room in this.settings[cmd])) {
			canUse = this.hasRank(user, ranks.substr(ranks.indexOf((cmd === 'autoban' || cmd === 'banword') ? '#' : config.defaultrank)));
		} else if (this.settings[cmd][room] === true) {
			canUse = true;
		} else if (ranks.indexOf(this.settings[cmd][room]) > -1) {
			canUse = this.hasRank(user, ranks.substr(ranks.indexOf(this.settings[cmd][room])));
		}
		return canUse;
	},
	isBlacklisted: function(user, room) {
		if (!this.settings.blacklist || !this.settings.blacklist[room]) return false;
		if (this.settings.blacklist[room][user]) return true;
		var abusers = Object.keys(this.settings.blacklist[room]);
		for (var i = 0; i < abusers.length; i++) {
			if (abusers[i].charAt(0) === '/') {
				var abRegex = new RegExp(abusers[i].substring(1, abusers[i].length - 3), 'gi');
				if (abRegex.test(user)) return true;
			}
		}
	},
	sendMail: function(user, room) {
		if (!this.messages || !this.messages[user]) return false;
		if (this.messages[user]) {
			console.log(user + ' has mail.');
			return true;
		}
	},
	blacklistUser: function(user, room) {
		if (!this.settings['blacklist']) this.settings['blacklist'] = {};
		if (!this.settings.blacklist[room]) this.settings.blacklist[room] = {};

		if (this.settings.blacklist[room][user]) return false;
		this.settings.blacklist[room][user] = 1; 
		return true;
	},
	unblacklistUser: function(user, room) {
		if (!this.isBlacklisted(user, room)) return false;
		delete this.settings.blacklist[room][user];
		return true;
	},
	uploadToHastebin: function(con, room, by, toUpload) {
		var self = this;

		var reqOpts = {
			hostname: "hastebin.com",
			method: "POST",
			path: '/documents'
		};

		var req = require('http').request(reqOpts, function(res) {
			res.on('data', function(chunk) {
				self.say(con, room, (room.charAt(0) === ',' ? "" : "/pm " + by + ", ") + "hastebin.com/raw/" + JSON.parse(chunk.toString())['key']);
			});
		});

		req.write(toUpload);
		req.end();
	},
	processChatData: function(user, room, connection, msg) {
		// NOTE: this is still in early stages
		var botName = msg.toLowerCase().indexOf(toId(config.nick));
		if (toId(user.substr(1)) === toId(config.nick)) {
			this.ranks[room] = user.charAt(0);
			return;
		}
		var by = user;
		user = toId(user);
		if (!user || room.charAt(0) === ',') return;
		room = toId(room);
		msg = msg.trim().replace(/ +/g, " ").replace(/[\u0000\u200B-\u200F]/g, "") // removes extra spaces and zero width characters so they doesn't trigger stretching

		this.updateSeen(user, 'c', room);
		var time = Date.now();
		if (!this.chatData[user]) this.chatData[user] = {
			zeroTol: 0,
			lastSeen: '',
			seenAt: time
		}
		if (!this.chatData[user][room]) this.chatData[user][room] = {times:[], points:0, lastAction:0};

		this.chatData[user][room].times.push(time);
		//makes the bot reset it's own connection if nobody says anything for too long
		if (config.resetduration) {
			clearTimeout(global.connectionTimer);
			refreshConnectionTimer();
		}
		
		// regex moderation
		if (/8={3,}D/.test(msg)) this.say(connection, room, '/m ' + user + ', l-lewd! ;///;');
		if (/alexonsager\.net/i.test(msg)) this.say(connection, room, '/k ' + user + ', Pokemon fusion genorators are not allowed in this room.');
		if (/ott+ers? bum+/i.test(msg)) this.say(connection, room, '/hm ' + user + '');
		if (/what does the (?:del)?(ph|f)ox say/i.test(msg)) this.say(connection, room, '/m ' + user + ', The fox says die. >:I');
		if (/[^0-9a-z\.\s][^0-9a-z\.]{6,}[^0-9a-z\.\s]/i.test(msg)) this.say(connection, room, '/k ' + user + ', This room is not for posting ASCII art and emoticons.');
		// recommend links
		if (/(somebody|someone|anyone|anybody|any1).*(make|making|draw(?:ing)?).*(me|my)/i.test(msg) && room === 'art') 
			this.say(connection, room, '/msg ' + user + ', Looking to have something drawn? Try submitting a request here: http://psartroom.weebly.com/requests.html');
		if (/us(e|ing) a link shortener/i.test(msg)) this.say(connection, room, 'To share long image links we recommend using a service such as http://goo.gl');
		if (/how.*(do|can).*(i|we).*(post|share).*here/i.test(msg)) this.say(connection, room, 'You can quickly post art online to get a link to share here with services such as [[imgur]] or [[puush]].');
		// define terms
		if (/what(\'s| is)( a)* fursona/i.test(msg)) this.say(connection, room, 'A \'fursona\' is an animal character one uses to represent themselves.');
		if (/(what\'s|what is|what are)( a)* scalies?/i.test(msg)) this.say(connection, room, 'A \'scalie\' is a reptie \'fursona\'; an animal character one uses to represent themselves.');
		if (/what(\'s| is)( a)* commission/i.test(msg)) this.say(connection, room, 'A \'commission\' is when an artist recieves payment in exchange for making a requested work.');
		if (/what(\'s| is) vectors*/i.test(msg)) this.say(connection, room, 'Vectors are the process of creating lines by defining the relationship of paths between points.');
		if (/what(\'s| is) cell shading/i.test(msg)) this.say(connection, room, 'Cell shading is a shading style where a hard edge is used with each color to indicate shadows rather than a gradual blur.');
		if (/what(\'s| is| does).*(roompaw|paw ?rank|pawprint)/i.test(msg)) this.say(connection, room, '\'Roompaw\' is a fake room rank used in my \\mail command and is a pun on being a PAWsitive user. c:');
		// other
		if (/why.*(roleplaying|rp) ?bot.*(here|in art)/i.test(msg)) this.say(connection, room, 'Roleplaying Bot is in this room to utilize its regex autoban feature. This is not an RP room.');
		if (/i(\'m| am).*go.*to (bed|sleep)/i.test(msg) || /good ?night everyone/i.test(msg)) this.say(connection, room, 'Goodnight ' + by + '. c:');
		if (/what(\'s| is) the (meaning|answer).*life/i.test(msg)) this.say(connection, room, 'The answer to life, the Universe, and everything is: 42');
		if (/(oo+h+|sick) burn/i.test(msg)) this.say(connection, room, '!data rawst berry');
		if (/de(a|e)r god/i.test(msg)) this.say(connection, room, '!data Xerneas');
		// auto RP
		if (botName > -1 && this.hasRank(by, '+%@#~') && toId(by) !== toId(config.nick)) {
			if (/^\/me/i.test(msg)) {
			/****************************************
			*  Section omitted because secrets. :3	*
			****************************************/
			}
		}

		// this deals with punishing rulebreakers, but note that the bot can't think, so it might make mistakes
		if (config.allowmute && this.hasRank(this.ranks[room] || ' ', '%@&#~') && config.whitelist.indexOf(user) === -1) {
			var useDefault = !(this.settings['modding'] && this.settings['modding'][room]);
			var pointVal = 0;
			var muteMessage = '';
			// moderation for banned words
			if (useDefault || this.settings['modding'][room]['bannedwords'] !== 0 && pointVal < 2) {
				var bannedPhrases = !!this.settings.bannedphrases ? (Object.keys(this.settings.bannedphrases[room] || {})).concat(Object.keys(this.settings.bannedphrases['global'] || {})) : [];
				for (var i = 0; i < bannedPhrases.length; i++) {
					if (msg.toLowerCase().indexOf(bannedPhrases[i]) > -1) {
						pointVal = 2;
						muteMessage = ', Automated response: your message contained a banned phrase';
						break;
					}
				}
			}
			// moderation for flooding (more than x lines in y seconds)
			var isFlooding = (this.chatData[user][room].times.length >= FLOOD_MESSAGE_NUM && (time - this.chatData[user][room].times[this.chatData[user][room].times.length - FLOOD_MESSAGE_NUM]) < FLOOD_MESSAGE_TIME
				&& (time - this.chatData[user][room].times[this.chatData[user][room].times.length - FLOOD_MESSAGE_NUM]) > (FLOOD_PER_MSG_MIN * FLOOD_MESSAGE_NUM));
			if ((useDefault || this.settings['modding'][room]['flooding'] !== 0) && isFlooding) {
				if (pointVal < 2) {
					pointVal = 2;
					muteMessage = ', Automated response: flooding';
				}
			}
			// moderation for caps (over x% of the letters in a line of y characters are capital)
			var capsMatch = msg.replace(/[^A-Za-z]/g, '').match(/[A-Z]/g);
			if ((useDefault || this.settings['modding'][room]['caps'] !== 0) && capsMatch && toId(msg).length > MIN_CAPS_LENGTH && (capsMatch.length >= Math.floor(toId(msg).length * MIN_CAPS_PROPORTION))) {
				if (pointVal < 1) {
					pointVal = 1;
					muteMessage = ', Automated response: caps';
				}
			}
			// moderation for stretching (over x consecutive characters in the message are the same)
			var stretchMatch = msg.toLowerCase().match(/(.)\1{7,}/g) || msg.toLowerCase().match(/(..+)\1{4,}/g); // matches the same character (or group of characters) 8 (or 5) or more times in a row
			if ((useDefault || this.settings['modding'][room]['stretching'] !== 0) && stretchMatch) {
				if (pointVal < 1) {
					pointVal = 1;
					muteMessage = ', Automated response: stretching';
				}
			}

			if (pointVal > 0 && !(time - this.chatData[user][room].lastAction < ACTION_COOLDOWN)) {
				var cmd = 'mute';
				// defaults to the next punishment in config.punishVals instead of repeating the same action (so a second warn-worthy
				// offence would result in a mute instead of a warn, and the third an hourmute, etc)
				if (this.chatData[user][room].points >= pointVal && pointVal < 4) {
					this.chatData[user][room].points++;
					cmd = config.punishvals[this.chatData[user][room].points] || cmd;
				} else { // if the action hasn't been done before (is worth more points) it will be the one picked
					cmd = config.punishvals[pointVal] || cmd;
					this.chatData[user][room].points = pointVal; // next action will be one level higher than this one (in most cases)
				}
				if (config.privaterooms.indexOf(room) >= 0 && cmd === 'warn') cmd = 'mute'; // can't warn in private rooms
				// if the bot has % and not @, it will default to hourmuting as its highest level of punishment instead of roombanning
				if (this.chatData[user][room].points >= 4 && !this.hasRank(this.ranks[room] || ' ', '@&#~')) cmd = 'hourmute';
				if (this.chatData[user].zeroTol > 4) { // if zero tolerance users break a rule they get an instant roomban or hourmute
					muteMessage = ', Automated response: zero tolerance user';
					cmd = this.hasRank(this.ranks[room] || ' ', '@&#~') ? 'roomban' : 'hourmute';
				}
				if (this.chatData[user][room].points >= 2) this.chatData[user].zeroTol++; // getting muted or higher increases your zero tolerance level (warns do not)
				this.chatData[user][room].lastAction = time;
				this.say(connection, room, '/' + cmd + ' ' + user + muteMessage);
			}
		}
	},
	updateSeen: function(user, type, detail) {
		user = toId(user);
		type = toId(type);
		if (type in {j:1, l:1, c:1} && (config.rooms.indexOf(toId(detail)) === -1 || config.privaterooms.indexOf(toId(detail)) > -1)) return;
		var time = Date.now();
		if (!this.chatData[user]) this.chatData[user] = {
			zeroTol: 0,
			lastSeen: '',
			seenAt: time
		};
		if (!detail) return;
		var msg = '';
		if (type in {j:1, l:1, c:1}) {
			msg += (type === 'j' ? 'joining' : (type === 'l' ? 'leaving' : 'chatting in')) + ' ' + detail.trim() + '.';
		} else if (type === 'n') {
			msg += 'changing nick to ' + ('+%@&#~'.indexOf(detail.trim().charAt(0)) === -1 ? detail.trim() : detail.trim().substr(1)) + '.';
		}
		if (msg) {
			this.chatData[user].lastSeen = msg;
			this.chatData[user].seenAt = time;
		}
	},
	getTimeAgo: function(time) {
		time = Date.now() - time;
		time = Math.round(time/1000); // rounds to nearest second
		var seconds = time%60;
		var times = [];
		if (seconds) times.push(String(seconds) + (seconds === 1?' second':' seconds'));
		var minutes, hours, days;
		if (time >= 60) {
			time = (time - seconds)/60; // converts to minutes
			minutes = time%60;
			if (minutes) times = [String(minutes) + (minutes === 1?' minute':' minutes')].concat(times);
			if (time >= 60) {
				time = (time - minutes)/60; // converts to hours
				hours = time%24;
				if (hours) times = [String(hours) + (hours === 1?' hour':' hours')].concat(times);
				if (time >= 24) {
					days = (time - hours)/24; // you can probably guess this one
					if (days) times = [String(days) + (days === 1?' day':' days')].concat(times);
				}
			}
		}
		if (!times.length) times.push('0 seconds');
		return times.join(', ');
	},
	splitDoc: function(voided) {
		if (!/https?:\/\//.test(voided)) return voided;
		voided = voided.replace(/doc.*(?=http)/i, '');
		var docIndex = voided.indexOf('http');
		voided = voided.substr(0, docIndex).replace(/[^a-z0-9]*$/i, '');
		return voided;
	},
	shuffle: function(array) {
		var counter = array.length, temp, index;
		while (counter > 0) {
			index = Math.floor(Math.random() * counter);
			counter--;
			temp = array[counter];
			array[counter] = array[index];
			array[index] = temp;
		}
		return array;
	},
	getImageSize: function(link) {
		var options = url.parse(link);
		global.ImageSize = {"width":0,"height":0};
		http.get(options, function (response) {
			var chunks = [];
			response.on('data', function (chunk) {
				chunks.push(chunk);
			}).on('end', function() {
				var buffer = Buffer.concat(chunks);
				global.ImageSize = sizeOf(buffer);
			});
		});
		var Size = global.ImageSize
		return Size;	
	},
	writeSettings: (function() {
		var writing = false;
		var writePending = false; // whether or not a new write is pending
		var finishWriting = function() {
			writing = false;
			if (writePending) {
				writePending = false;
				this.writeSettings();
			}
		};
		return function() {
			if (writing) {
				writePending = true;
				return;

			}
			writing = true;
			var data = JSON.stringify(this.settings);
			fs.writeFile('settings.json.0', data, function() {
				// rename is atomic on POSIX, but will throw an error on Windows
				fs.rename('settings.json.0', 'settings.json', function(err) {
					if (err) {
						// This should only happen on Windows.
						fs.writeFile('settings.json', data, finishWriting);
						return;
					}
					finishWriting();
				});
			});
		};
	})(),
	writeMessages: (function() {
		var writing = false;
		var writePending = false; // whether or not a new write is pending
		var finishWriting = function() {
			writing = false;
			if (writePending) {
				writePending = false;
				this.writeMessages();
			}
		};
		return function() {
			if (writing) {
				writePending = true;
				return;

			}
			writing = true;
			var data = JSON.stringify(this.messages);
			fs.writeFile('messages.json.0', data, function() {
				// rename is atomic on POSIX, but will throw an error on Windows
				fs.rename('messages.json.0', 'messages.json', function(err) {
					if (err) {
						// This should only happen on Windows.
						fs.writeFile('messages.json', data, finishWriting);
						return;
					}
					finishWriting();
				});
			});
		};
	})(),
	uncacheTree: function(root) {
		var uncache = [require.resolve(root)];
		do {
			var newuncache = [];
			for (var i = 0; i < uncache.length; ++i) {
				if (require.cache[uncache[i]]) {
					newuncache.push.apply(newuncache,
						require.cache[uncache[i]].children.map(function(module) {
							return module.filename;
						})
					);
					delete require.cache[uncache[i]];
				}
			}
			uncache = newuncache;
		} while (uncache.length > 0);
	},
};
