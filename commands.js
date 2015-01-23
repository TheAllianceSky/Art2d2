/**
 * This is the file where the bot commands are located
 *
 * @license MIT license
 */

const DAdollar = 80;
const DAeuro = 134;
const DApound = 140;
const MESSAGES_TIME_OUT = 7 * 24 * 60 * 60 * 1000;
var NumOfJokes = 0;
for (joke in Jokes) {
	NumOfJokes++;
}
var middleButton = '<a href="http://ps-art-room-official.deviantart.com/journal/Contest-Redesign-that-pokemon-504429821"><img src="http://i.imgur.com/KZhRg7q.gif" width="105" height="30"></a>';

var url = require('url');
var http = require('http');
var sys = require('sys');
var sizeOf = require('image-size');

exports.commands = {
	/**
	 * Help commands
	 *
	 * These commands are here to provide information about the bot.
	 */

	about: function(arg, by, room, con) {
		if (this.hasRank(by, '#~') || room.charAt(0) === ',') {
			var text = '';
		} else {
			var text = '/pm ' + by + ', ';
		}
		text += '**Art Room Bot:** fork of Roleplaying Bot by Morfent, TalkTakesTime and Quinella, with custom Art Room commands by AxeBane and SolarisFox.';
		this.say(con, room, text);
	},
	help: 'guide',
	guide: function(arg, by, room, con) {
		if (this.hasRank(by, '+%@#~') || room.charAt(0) === ',') {
			var text = '';
		} else {
			var text = '/pm ' + by + ', ';
		}
		if (config.botguide) {
			text += 'A guide on how to use this bot can be found here: ' + config.botguide;
		} else {
			text += 'There is no guide for this bot. PM the bot\'s owner with any questions.';
		}
		this.say(con, room, text);
	},

	/**
	 * Dev commands
	 *
	 * These commands are here for highly ranked users (or the creator) to use
	 * to perform arbitrary actions that can't be done through any other commands
	 * or to help with upkeep of the bot.
	 */

	reload: function(arg, by, room, con) {
		if (!this.hasRank(by, '#~')) return false;
		try {
			this.uncacheTree('./commands.js');
			Commands = require('./commands.js').commands;
			this.say(con, room, 'These impeccable commands have been reloaded.');
		} catch (e) {
			error('failed to reload: ' + sys.inspect(e));
		}
	},
	do: function(arg, by, room, con) {
		if (!this.hasRank(by, '#')) return false;
		if (arg.indexOf('[') === 0 && arg.indexOf(']') > -1) {
			var tarRoom = arg.slice(1, arg.indexOf(']'));
			arg = arg.substr(arg.indexOf(']') + 1).trim();
		}
		this.say(con, tarRoom || room, arg);
	},
	js: function(arg, by, room, con) {
		if (config.excepts.indexOf(toId(by)) === -1) return false;
		try {
			var result = eval(arg.trim());
			this.say(con, room, JSON.stringify(result));
		} catch (e) {
			this.say(con, room, e.name + ": " + e.message);
		}
	},
	test: function(arg, by, room, con) {
		if (config.excepts.indexOf(toId(by)) === -1) return false;
		console.log(arg.charAt(0));
	},

	/**
	 * Room Owner commands
	 *
	 * These commands allow room owners to personalise settings for moderation and command use.
	 */

	settings: 'set',
	set: function(arg, by, room, con) {
		if (!this.hasRank(by, '%@&#~') || room.charAt(0) === ',') return false;

		var settable = {
			joke: 1,
			fox: 1,
			esupport: 1,
			autoban: 1,
			regexautoban: 1,
			banword: 1,
			setstream: 1,
			randomcommands: 1,
			message: 1
		};
		var modOpts = {
			flooding: 1,
			caps: 1,
			stretching: 1,
			bannedwords: 1,
			snen: 1
		};

		var opts = arg.split(',');
		var cmd = toId(opts[0]);
		if (cmd === 'mod' || cmd === 'm' || cmd === 'modding') {
			if (!opts[1] || !toId(opts[1]) || !(toId(opts[1]) in modOpts)) return this.say(con, room, 'Incorrect command: correct syntax is .set mod, [' +
				Object.keys(modOpts).join('/') + '](, [on/off])');

			if (!this.settings['modding']) this.settings['modding'] = {};
			if (!this.settings['modding'][room]) this.settings['modding'][room] = {};
			if (opts[2] && toId(opts[2])) {
				if (!this.hasRank(by, '#~')) return false;
				if (!(toId(opts[2]) in {on: 1, off: 1}))  return this.say(con, room, 'Incorrect command: correct syntax is .set mod, [' +
					Object.keys(modOpts).join('/') + '](, [on/off])');
				if (toId(opts[2]) === 'off') {
					this.settings['modding'][room][toId(opts[1])] = 0;
				} else {
					delete this.settings['modding'][room][toId(opts[1])];
				}
				this.writeSettings();
				this.say(con, room, 'Moderation for ' + toId(opts[1]) + ' in this room is now ' + toId(opts[2]).toUpperCase() + '.');
				return;
			} else {
				this.say(con, room, 'Moderation for ' + toId(opts[1]) + ' in this room is currently ' +
					(this.settings['modding'][room][toId(opts[1])] === 0 ? 'OFF' : 'ON') + '.');
				return;
			}
		} else {
			if (!Commands[cmd]) return this.say(con, room, '\\' + opts[0] + ' is not a valid command.');
			var failsafe = 0;
			while (!(cmd in settable)) {
				if (typeof Commands[cmd] === 'string') {
					cmd = Commands[cmd];
				} else if (typeof Commands[cmd] === 'function') {
					if (cmd in settable) {
						break;
					} else {
						this.say(con, room, 'The settings for \\' + opts[0] + ' cannot be changed.');
						return;
					}
				} else {
					this.say(con, room, 'Something went wrong. PM SolarisFox here or on Smogon with the command you tried.');
					return;
				}
				failsafe++;
				if (failsafe > 5) {
					this.say(con, room, 'The command "\\' + opts[0] + '" could not be found.');
					return;
				}
			}

			var settingsLevels = {
				off: false,
				disable: false,
				'+': '+',
				'%': '%',
				'@': '@',
				'&': '&',
				'#': '#',
				'~': '~',
				on: true,
				enable: true
			};
			if (!opts[1] || !opts[1].trim()) {
				var msg = '';
				if (!this.settings[cmd] || (!this.settings[cmd][room] && this.settings[cmd][room] !== false)) {
					msg = '\\' + cmd + ' is available for users of rank ' + ((cmd === 'autoban' || cmd === 'banword') ? '#' : config.defaultrank) + ' and above.';
				} else if (this.settings[cmd][room] in settingsLevels) {
					msg = '\\' + cmd + ' is available for users of rank ' + this.settings[cmd][room] + ' and above.';
				} else if (this.settings[cmd][room] === true) {
					msg = '\\' + cmd + ' is available for all users in this room.';
				} else if (this.settings[cmd][room] === false) {
					msg = '\\' + cmd + ' is not available for use in this room.';
				}
				this.say(con, room, msg);
				return;
			} else {
				if (!this.hasRank(by, '#~')) return false;
				var newRank = opts[1].trim();
				if (!(newRank in settingsLevels)) return this.say(con, room, 'Unknown option: "' + newRank + '". Valid settings are: off/disable, +, %, @, &, #, ~, on/enable.');
				if (!this.settings[cmd]) this.settings[cmd] = {};
				this.settings[cmd][room] = settingsLevels[newRank];
				this.writeSettings();
				this.say(con, room, 'The command \\' + cmd + ' is now ' +
					(settingsLevels[newRank] === newRank ? ' available for users of rank ' + newRank + ' and above.' :
					(this.settings[cmd][room] ? 'available for all users in this room.' : 'unavailable for use in this room.')))
			}
		}
	},
	blacklist: 'autoban',
	ban: 'autoban',
	ab: 'autoban',
	autoban: function(arg, by, room, con) {
		if (!this.canUse('autoban', room, by) || room.charAt(0) === ',') return false;

		arg = arg.split(',');
		var added = [];
		var illegalNick = [];
		var alreadyAdded = [];
		if (!arg.length || (arg.length === 1 && !arg[0].trim().length)) return this.say(con, room, 'You must specify at least one user to blacklist.');
		for (var i = 0; i < arg.length; i++) {
			var tarUser = toId(arg[i]);
			if (tarUser.length < 1 || tarUser.length > 18) {
				illegalNick.push(tarUser);
				continue;
			}
			if (!this.blacklistUser(tarUser, room)) {
				alreadyAdded.push(tarUser);
				continue;
			}
			this.say(con, room, '/roomban ' + tarUser + ', Blacklisted user');
			this.say(con,room, '/modnote ' + tarUser + ' was added to the blacklist by ' + by + '.');
			added.push(tarUser);
		}
	},
	unblacklist: 'unautoban',
	unban: 'unautoban',
	unab: 'unautoban',
	unautoban: function(arg, by, room, con) {
		if (!this.canUse('autoban', room, by) || room.charAt(0) === ',') return false;

		arg = arg.split(',');
		var removed = [];
		var notRemoved = [];
		if (!arg.length || (arg.length === 1 && !arg[0].trim().length)) return this.say(con, room, 'You must specify at least one user to unblacklist.');
		for (var i = 0; i < arg.length; i++) {
			var tarUser = toId(arg[i]);
			if (tarUser.length < 1 || tarUser.length > 18) {
				notRemoved.push(tarUser);
				continue;
			}
			if (!this.unblacklistUser(tarUser, room)) {
				notRemoved.push(tarUser);
				continue;
			}
			this.say(con, room, '/roomunban ' + tarUser);
			removed.push(tarUser);
		}

		var text = '';
		if (removed.length) {
			text += 'User(s) "' + removed.join('", "') + '" removed from blacklist successfully. ';
			this.writeSettings();
		}
		if (notRemoved.length) text += (text.length ? 'No other ' : 'No ') + 'specified users were present in the blacklist.';
		this.say(con, room, text);
	},
	rab: 'regexautoban',
	regexab: 'regexautoban',
	regexautoban: function(arg, by, room, con) {
		if (!this.canUse('regexautoban', room, by) || room.charAt(0) === ',') return false;
		if (!arg) return this.say(con, room, 'No pattern was specified.');
		if (!/[^\\\{,]\w/.test(arg)) return false;
		arg = '/' + arg + '/gi';
		if (!this.blacklistUser(arg, room)) return this.say(con, room, 'Pattern ' + arg + ' is already present in the blacklist.');	

		this.say(con, room, 'Pattern ' + arg + ' added to the blacklist successfully.');
		this.writeSettings();
	},
	unrab: 'unregexautoban',
	unregexab: 'unregexautoban',
	unregexautoban: function(arg, by, room, con) {
		if (!this.canUse('regexautoban', room, by) || room.charAt(0) === ',') return false;
		if (!arg) return this.say(con, room, 'No pattern was specified.');
		arg = '/' + arg + '/gi';
		if (!this.unblacklistUser(arg, room)) return this.say(con, room, 'Pattern ' + arg + ' isn\'t present in the blacklist.');

		this.say(con, room, 'Pattern ' + arg + ' removed from the blacklist successfully.');
		this.writeSettings();
	},
	viewbans: 'viewblacklist',
	vab: 'viewblacklist',
	viewautobans: 'viewblacklist',
	viewblacklist: function(arg, by, room, con) {
		if (!this.canUse('autoban', room, by) || room.charAt(0) === ',') return false;

		var text = '';
		if (!this.settings.blacklist || !this.settings.blacklist[room]) {
			text = 'No users are blacklisted in this room.';
		} else {
			if (arg.length) {
				var nick = toId(arg);
				if (nick.length < 1 || nick.length > 18) {
					text = 'Invalid nickname: "' + nick + '".';
				} else {
					text = 'User "' + nick + '" is currently ' + (nick in this.settings.blacklist[room] ? '' : 'not ') + 'blacklisted in ' + room + '.';
				}
			} else {
				var nickList = Object.keys(this.settings.blacklist[room]);
				if (!nickList.length) return this.say(con, room, '/pm ' + by + ', No users are blacklisted in this room.');
				this.uploadToHastebin(con, room, by, 'The following users are banned in ' + room + ':\n\n' + nickList.join('\n'))
				return;
			}
		}
		this.say(con, room, '/pm ' + by + ', ' + text);
	},
	banphrase: 'banword',
	banword: function(arg, by, room, con) {
		if (!this.canUse('banword', room, by)) return false;
		if (!this.settings.bannedphrases) this.settings.bannedphrases = {};
		arg = arg.trim().toLowerCase();
		if (!arg) return false;
		var tarRoom = room;

		if (room.charAt(0) === ',') {
			if (!this.hasRank(by, '~')) return false;
			tarRoom = 'global';
		}

		if (!this.settings.bannedphrases[tarRoom]) this.settings.bannedphrases[tarRoom] = {};
		if (arg in this.settings.bannedphrases[tarRoom]) return this.say(con, room, "Phrase \"" + arg + "\" is already banned.");
		this.settings.bannedphrases[tarRoom][arg] = 1;
		this.writeSettings();
		this.say(con, room, "Phrase \"" + arg + "\" is now banned.");
	},
	unbanphrase: 'unbanword',
	unbanword: function(arg, by, room, con) {
		if (!this.canUse('banword', room, by)) return false;
		arg = arg.trim().toLowerCase();
		if (!arg) return false;
		var tarRoom = room;

		if (room.charAt(0) === ',') {
			if (!this.hasRank(by, '~')) return false;
			tarRoom = 'global';
		}

		if (!this.settings.bannedphrases || !this.settings.bannedphrases[tarRoom] || !(arg in this.settings.bannedphrases[tarRoom])) 
			return this.say(con, room, "Phrase \"" + arg + "\" is not currently banned.");
		delete this.settings.bannedphrases[tarRoom][arg];
		if (!Object.size(this.settings.bannedphrases[tarRoom])) delete this.settings.bannedphrases[tarRoom];
		if (!Object.size(this.settings.bannedphrases)) delete this.settings.bannedphrases;
		this.writeSettings();
		this.say(con, room, "Phrase \"" + arg + "\" is no longer banned.");
	},
	viewbannedphrases: 'viewbannedwords',
	vbw: 'viewbannedwords',
	viewbannedwords: function(arg, by, room, con) {
		if (!this.canUse('banword', room, by)) return false;
		arg = arg.trim().toLowerCase();
		var tarRoom = room;

		if (room.charAt(0) === ',') {
			if (!this.hasRank(by, '~')) return false;
			tarRoom = 'global';
		}

		var text = "";
		if (!this.settings.bannedphrases || !this.settings.bannedphrases[tarRoom]) {
			text = "No phrases are banned in this room.";
		} else {
			if (arg.length) {
				text = "The phrase \"" + arg + "\" is currently " + (arg in this.settings.bannedphrases[tarRoom] ? "" : "not ") + "banned " +
					(room.charAt(0) === ',' ? "globally" : "in " + room) + ".";
			} else {
				var banList = Object.keys(this.settings.bannedphrases[tarRoom]);
				if (!banList.length) return this.say(con, room, "No phrases are banned in this room.");
				this.uploadToHastebin(con, room, by, "The following phrases are banned " + (room.charAt(0) === ',' ? "globally" : "in " + room) + ":\n\n" + banList.join('\n'))
				return;
			}
		}
		this.say(con, room, text);
	},
	leave: function(arg, by, room, con) {
		if (!this.hasRank(by, '#~') && toId(by) !== 'healndeal') return false;
		this.say(con, room, '/leave');
	},

	/**
	 * General commands
	 *
	 * Add custom commands here.
	 */
	 
	randomcommands: function(arg, by, room, con) {
		if (this.canUse('randomcommands', room, by) || room.charAt(0) === ',') {
			var text = '';
		} else {
			var text = '/pm ' + by + ', ';
		}
		this.say(con, room, text + 'Random commands are: \'randpokemon\', \'randtype\', \'randstats\', \'randitem\', \'randability\', \'randlocation\', \'randpalette\'');
	},
	data: 'dex',
	dex: function(arg, by, room, con) {
		if (room.charAt(0) === ',') {
			var text = '';
		} else if (this.hasRank(by, '+%@#~')) {
			var text = '!dex ';
		} else {
			var text = '/pm ' + by + ', ';
		}
		if (arg === '722') return this.say(con, room, "//dex Solaris: http://puu.sh/cshsL.jpg");
		if (isNaN(arg) || arg < 0 || arg > 721) return this.say(con, room, "Pokemon must be searched by Dex number.");
		var pokemon = Pokedex[arg].species;
		this.say(con, room, text + pokemon);
	},
	rt: 'randtype',
	gentype: 'randtype',
	randomtype: 'randtype',
	randtype: function(arg, by, room, con) {
		if (this.canUse('randomcommands', room, by) || room.charAt(0) === ',') {
			var text = '';
		} else {
			var text = '/pm ' + by + ', ';
		}
		var type = [];
		for (i = 0; i < 2; i++) {
			type[i] = Math.floor(18 * Math.random()) + 1;
			switch (type[i]) {
				case 1: type[i] = "Normal"; break;
				case 2: type[i] = "Fire"; break;
				case 3: type[i] = "Water"; break;
				case 4: type[i] = "Electric"; break;
				case 5: type[i] = "Grass"; break;
				case 6: type[i] = "Ice"; break;
				case 7: type[i] = "Fighting"; break;
				case 8: type[i] = "Poison"; break;
				case 9: type[i] = "Flying"; break;
				case 10: type[i] = "Ground"; break;
				case 11: type[i] = "Psychic"; break;
				case 12: type[i] = "Bug"; break;
				case 13: type[i] = "Rock"; break;
				case 14: type[i] = "Ghost"; break;
				case 15: type[i] = "Dragon"; break;
				case 16: type[i] = "Dark"; break;
				case 17: type[i] = "Steel"; break;
				case 18: type[i] = "Fairy"; break;
				default: return this.say(con, room, "error");
			}
		}
		if (type[1] !== type[0]) {
			text += "Randomly generated type: **" + type[0] + "/" + type[1] + "**";
		} else {
			text += "Randomly generated type: **" + type[0] + "**";
		}
		this.say(con, room, text);
		return type;
	},
	rollpokemon: 'randpokemon',
	randpoke: 'randpokemon',
	randompoke: 'randpokemon',
	randompokemon: 'randpokemon',
	randpokemon: function(arg, by, room, con) {
		if (this.canUse('randomcommands', room, by) || room.charAt(0) === ',') {
			var text = '';
		} else {
			var text = '/pm ' + by + ', ';
		}
		var randompokes = [];
		var parameters = [];
		/**	OBJECT KEY
		 *  0 = will reject roll if it has property
		 *  1 = property will not affect roll
		 *  2 = roll will be rejected if it lacks this property
		 */
		var conditions = {"legend":1,"nfe":1,"mega":1,"forms":1,"shiny":1};
		var types = {"normal":1,"fire":1,"water":1,"grass":1,"electric":1,"ice":1,"fighting":1,"poison":1,"ground":1,"flying":1,"psychic":1,"bug":1,"rock":1,"ghost":1,"dragon":1,"dark":1,"steel":1,"fairy":1};
		var tiers = {"uber":1,"ou":1,"uu":1,"ru":1,"nu":1,"pu":1,"cap":1};
		var singleType = false;
		var singleTier = false;
		var noDt = {"Unown":1,"Shellos":1,"Gastrodon":1,"Deerling":1,"Sawsbuck":1,"Vivillon":1,"Flabebe":1,"Floette":1,"Florges":1,"Furfrou":1};
		
		var pokequantity = 1;
		if (arg) {
			parameters = arg.toLowerCase().split(", ");
			var hasBeenSet = false;
			for (j=0; j<parameters.length; j++) {
				if (parameters[j] == parseInt(parameters[j], 10)) {
					if (hasBeenSet) return this.say(con, room, 'Please only specify number of pokemon once');
					if (parameters[j] < 1 || parameters[j] > 6) return this.say(con, room, "Quantity of random pokemon must be between 1 and 6.");
					pokequantity = parameters[j];
					hasBeenSet = true;
					continue;
				}
				var notGate = false;
				if (parameters[j].charAt(0) === '!') {
					notGate = true;
					parameters[j] = parameters[j].substr(1);
				}
				//argument alias list
				switch (parameters[j]) {
					case "legendary": parameters[j] = "legend"; break;
					case "fe": parameters[j] = "nfe"; notGate = !notGate; break;
					case "ubers": parameters[j] = "uber"; break;
				}
				
				if (parameters[j] in conditions) {
					if (conditions[parameters[j]] !== 1) return this.say(con, room, 'Cannot include both \'' + parameters[j] + '\' and \'!' + parameters[j] + '\'.');
					if (notGate) {
						if (parameters[j] === 'forms') conditions.mega = 0;
						conditions[parameters[j]] = 0;
					} else {
						conditions[parameters[j]] = 2;
					}
					continue;
				}
				if (parameters[j].indexOf(' type') > -1) parameters[j] = parameters[j].substr(0, parameters[j].length - 5);
				if (parameters[j] in types) {
					if (types[parameters[j]] !== 1) return this.say(con, room, 'Cannot include both \'' + parameters[j] + '\' and \'!' + parameters[j] + '\'.');
					if (notGate) {
						types[parameters[j]] = 0;
					} else {
						types[parameters[j]] = 2;
						singleType = true;
					}
					continue;
				}
				if (parameters[j] in tiers) {
					if (tiers[parameters[j]] !== 1) return this.say(con, room, 'Cannot include both \'' + parameters[j] + '\' and \'!' + parameters[j] + '\'.');
					if (notGate) {
						tiers[parameters[j]] = 0;
					} else {
						tiers[parameters[j]] = 2;
						singleTier = true;
					}
					continue;
				} else {
					return this.say(con, room, 'Parameter \'' + parameters[j] + '\' not recognized.');
				}
			}
			
			if (singleType) {
				for (var set in types) {
					if (types[set] === 1) types[set] = 0;
				}
			}
			if (singleTier) {
				for (var set in tiers) {
					if (tiers[set] === 1) tiers[set] = 0;
				}
			}
		}
		if (pokequantity == 1 && room.charAt(0) !== ',' && this.hasRank(by, '+%@#~')) text = '!dt ';
		
		var attempt = -1;
		var dexNumbers = [];
		if (parameters.length > 0) {
			//create an array for all dex numbers and then shuffle it
			var dexLength = ((tiers.cap === 0 ? 19 : 0) + 723);
			if (tiers.cap === 2) dexLength = 19;
			for (g=(tiers.cap === 0 ? 0 : -19); g<dexLength; g++) {
				dexNumbers.push(g);
			}
			dexNumbers = this.shuffle(dexNumbers);
		}
		for (i=0; i<pokequantity; i++) {
			attempt++;
			if (attempt > 722) {
				console.log('randpoke fail: ' + parameters);
				text = (room.charAt(0) === ',') ? '' : '/pm ' + by + ', ';
				return this.say(con, room, text + 'Could not find ' + pokequantity + ' unique Pokemon with ``' + parameters.join(', ') + '``');
			}
			var skipPoke = false;
		if (parameters.length > 0) {
				var pokeNum = dexNumbers[attempt];
			} else {
				var pokeNum = Math.floor(723 * Math.random());
			}
			if (conditions.legend === 2 && !Pokedex[pokeNum].legend) {i--; continue;}
			if (conditions.nfe === 2 && !Pokedex[pokeNum].nfe) {i--; continue;}
			if (conditions.mega === 2 && !Pokedex[pokeNum].mega) {i--; continue;}
			if (conditions.forms === 2 && !Pokedex[pokeNum].forms) {i--; continue;}
			if (conditions.legend === 0 && Pokedex[pokeNum].legend) {i--; continue;}
			if (conditions.nfe === 0 && Pokedex[pokeNum].nfe) {i--; continue;}
			if ((singleTier && !Pokedex[pokeNum].tier) || tiers[Pokedex[pokeNum].tier] === 0) {i--; continue;}
			for (h=0; h<Pokedex[pokeNum].type.length; h++) {
				var currentType = Pokedex[pokeNum].type[h].toLowerCase();
				if (types[currentType] !== 0) break;
				skipPoke = true;
			}
			if (skipPoke) {i--; continue;}
			if (Pokedex[pokeNum].mega && conditions.mega !== 0) {
				var buffer = Pokedex[pokeNum].species; 
				var megaNum = (conditions.mega === 2 ? 0 : -1)
				megaNum += Math.floor((Pokedex[pokeNum].mega.length + (conditions.mega === 2 ? 0 : 1)) * Math.random());
				if (megaNum == -1) {
					randompokes.push(buffer);
				} else {
					randompokes.push(buffer + '-' + Pokedex[pokeNum].mega[megaNum]);
				}
				continue;
			}
			if (Pokedex[pokeNum].forms && conditions.forms !== 0) {
				var formNum = Math.floor(Pokedex[pokeNum].forms.length * Math.random());
				if (Pokedex[pokeNum].forms[formNum] !== "norm") {
					var buffer = Pokedex[pokeNum].species;
					if (text === '!dt ' && noDt[buffer] && Pokedex[pokeNum].forms[formNum] !== "eternal-flower") text = '';
					randompokes.push(buffer + '-__' + Pokedex[pokeNum].forms[formNum] + '__');
					continue;
				}
			}
			randompokes.push(Pokedex[pokeNum].species);
		}
		for (k=0; k<randompokes.length; k++) {
			if (Math.floor(((conditions.shiny === 2) ? 2 : 1364) * Math.random()) !== 0) continue;
			randompokes[k] = '``shiny`` ' + randompokes[k];
		}
		this.say(con, room, text + randompokes.join(", "));
	},
	randavi: 'randomtrainer',
	randomavatar: 'randomtrainer',
	randtrainer: 'randomtrainer',
	randomtrainer: function(arg, by, room, con) {
		if (!(room in this.RP) && !room.charAt(0) === ',') return false;
		if (this.canUse('randomcommands', room, by) || room.charAt(0) === ',') {
			var text = '';
		} else {
			var text = '/pm ' + by + ', ';
		}
		var trainerNumber = Math.floor((294 * Math.random()) + 1);
		this.say(con, room, text + 'Random PS! Avatar: http://play.pokemonshowdown.com/sprites/trainers/' + trainerNumber + '.png');
	},
	rl: 'randomlocation',
	randscene: 'randomlocation',
	randlocation: 'randomlocation',
	randomlocation: function(arg, by, room, con) {
		if (!(room in this.RP) && !room.charAt(0) === ',') return false;
		if (this.canUse('randomcommands', room, by) || room.charAt(0) === ',') {
			var text = '';
		} else {
			var text = '/pm ' + by + ', ';
		}
		var adjectives = ["crystal", "floating", "eternal-dusk", "sunset", "snowy", "rainy", "sunny", "chaotic", "peaceful", "colorful", "gooey", "fiery", "jagged", "glass", "vibrant", "rainbow", "foggy",
				"calm", "demonic", "polygonal", "glistening", "sexy", "overgrown", "frozen", "dark", "mechanical", "mystic", "steampunk", "subterranean", "polluted", "bleak", "dank", "smooth", "vast", "pixelated",
				"enigmatic", "illusionary", "sketchy", "spooky", "flying", "legendary", "cubic", "moist", "oriental", "fluffy", "odd", "fancy", "strange", "authentic", "bustling", "barren", "cluttered", "creepy", "dangerous",
				"distant", "massive", "exotic", "tainted", "filthy", "flawless", "forsaken", "frigid", "frosty", "grand", "grandiose", "grotesque", "harmful", "harsh", "hospitable", "hot", "jaded", "meek", "weird", "awkward",
				"silly", "cursed", "blessed", "drought-stricken"
		];
		var locations = ["river", "island", "desert", "forest", "jungle", "plains", "mountains", "mesa", "cave", "canyon", "marsh", "lake", "plateau", "tundra", "volcano", "valley", "waterfall", "atoll",
				"asteroid", "grove", "treetops", "cavern", "beach", "ocean", "plains", "heavens", "abyss", "city", "crag", "planetoid", "harbor", "evergreen", "cabin", "hill", "field", "ship", "glacier", "estuary",
				"wasteland", "sky", "chamber", "ruin", "tomb", "park", "closet", "terrace", "air balloon", "shrine", "room", "swamp", "road", "path", "gateway", "school", "building", "vault", "pool", "pit",
				"temple", "lagoon", "prison", "harem", "mine", "catacombs"
		];
		var adjNum = Math.floor(adjectives.length * Math.random());
		var locNum = Math.floor(locations.length * Math.random());
		this.say(con, room, text + 'Random scenery: **' + adjectives[adjNum] + ' ' + locations[locNum] + '**.');
	},
	randsalad: 'randomsalad',
	randomsalad: function(arg, by, room, con) {
		if (!(room in this.RP) && !room.charAt(0) === ',') return false;
		if (this.canUse('randomcommands', room, by) || room.charAt(0) === ',') {
			var text = '';
		} else {
			var text = '/pm ' + by + ', ';
		}
		var adjectives = ["Crunchy","Cold","Warm","Moist","Yummy Yummy","Fresh","Rotten","Sketchy","Steamy","Glossy","Sparkly","Purple","Delicious","Heavenly","Stinky","Wet","Sexy","Explosive","Soggy","Giant","Hot",
				"Sparkling","Deluxe","Up-side Down","Omnipotent","Spicy","Milky","Tangy","Mmmmm~","Otter-Flavored","Flying","Salad-Flavored","Mystery","Radioactive","Sadistic","Microwaved"
		];
		var salads = ["Ambrosia Salad","Acar Salad","Antipasto","Arab Salad","Asinan","Bean Salad","Caesar Salad","Cheese Slaw","Chef Salad","Chicken Salad","Cobb Salad","Coleslaw","Crab Louie","Dressed Herring","Egg Salad",
				"Fattoush","Fiambre","Fruit Salad","Garden Salad","Greek Salad","Ham Salad","Jell-o Salad","Macaroni Salad","Michigan Salad","Panzanella","Pasta Salad","Potato Salad","Sheperd's Salad","Szalot",
				"Taco Salad","Tuna Salad","Waldorf Salad","Salad Salad"
		];
		var adjNum = Math.floor(adjectives.length * Math.random());
		var saladNum = Math.floor(salads.length * Math.random());
		this.say(con, room, text + 'Random salad: **' + adjectives[adjNum] + '** [[**' + salads[saladNum] + '**]].');
	},
	rm: 'randommove',
	randmove: 'randommove',
	randommove: function(arg, by, room, con) {
		if (this.canUse('randomcommands', room, by) || room.charAt(0) === ',') {
			var text = '';
		} else {
			var text = '/pm ' + by + ', ';
		}
		var conditions = {"viable":1,"tm":1};
		var types = {"normal":1,"fire":1,"water":1,"grass":1,"electric":1,"ice":1,"fighting":1,"poison":1,"ground":1,"flying":1,"psychic":1,"bug":1,"rock":1,"ghost":1,"dragon":1,"dark":1,"steel":1,"fairy":1};
		var classes = {"physical":1,"special":1,"status":1};
		var moveQuantity = 1;
		var hasBeenSet = false;
		var singleType = false;
		var singleClass = false;
		
		var parameters = arg.split(', ');
		for (var i=0; i<parameters.length; i++) {
			if (parameters[i] == parseInt(parameters[i], 10)) {
				if (hasBeenSet) return this.say(con, room, 'Please only specify number of moves once');
				if (parameters[i] < 1 || parameters[i] > 6) return this.say(con, room, "Quantity of random moves must be between 1 and 6.");
				moveQuantity = parameters[i];
				hasBeenSet = true;
				continue;
			}
			var notGate = false; 
			if (parameters[i].charAt(0) === '!') {
				notGate = true;
				parameters[i] = parameters[i].substr(1);
			}
			var parameter = toId(parameters[i]);
			if (parameter in types) {
				if (types[parameter] === 1 && !notGate) {
					types[parameter] = 2;
					singleType = true;
				} else if (types[parameter] === 1 && notGate) {
					types[parameter] = 0;
				} else {
					return this.say(con, room, 'Cannot include both \'' + parameters[i] + '\' and \'!' + parameters[i] + '\'.');
				}
			} else if (parameter in classes) {
				if (classes[parameter] === 1 && !notGate) {
					classes[parameter] = 2;
					singleClass = true;
				} else if (classes[parameter] === 1 && notGate) {
					classes[parameter] = 0;
				} else {
					return this.say(con, room, 'Cannot include both \'' + parameters[i] + '\' and \'!' + parameters[i] + '\'.');
				}
			} else if (parameter in conditions) {
				if (conditions[parameter] === 1 && !notGate) {
					conditions[parameter] = 2;
				} else if (conditions[parameter] === 1 && notGate) {
					conditions[parameter] = 0;
				} else {
					return this.say(con, room, 'Cannot include both \'' + parameters[i] + '\' and \'!' + parameters[i] + '\'.');
				}
			} else if (arg) {
				return this.say(con, room, 'Parameter \'' + parameters[i] + '\' not recognized.');
			}
		}
		if (singleType) {
			for (var set in types) {
				if (types[set] == 1) types[set] = 0;
			}
		}
		if (singleClass) {
			for (var set in classes) {
				if (classes[set] == 1) classes[set] = 0;
			}
		}
		
		var randomMoves = [];
		var attempts = 0;
		var dexNumbers = [];
		if (parameters.length > 0) {
			//create an array for all move numbers and then shuffle it
			for (g=1; g<613; g++) {
				dexNumbers.push(g);
			}
			dexNumbers = this.shuffle(dexNumbers);

			for (var j=0; j<moveQuantity; j++) {
				attempts++;
				if (attempts > 611) {
					console.log('randmove fail: ' + parameters);
					text = (room.charAt(0) === ',') ? '' : '/pm ' + by + ', ';
					return this.say(con, room, text + 'could not find ' + moveQuantity + ' unique Pokemon with ``' + parameters.join(', ') + '``');
				}
				var roll = dexNumbers[attempts];
				if (types[Movedex[roll].type] === 0) {j--; continue;}
				if (classes[Movedex[roll].class] === 0) {j--; continue;}
				if ((conditions.tm === 0 && Movedex[roll].TM) || (conditions.tm === 2 && !Movedex[roll].TM)) {j--; continue;}
				if ((conditions.viable === 0 && Movedex[roll].viable) || (conditions.viable === 2 && !Movedex[roll].viable)) {j--; continue;}
				randomMoves.push(Movedex[roll].name);
			}
		} else {
			randomMoves = Movedex[Math.floor((613 * Math.random()) + 1)];
		}
		if (!text && this.hasRank(by, '+%@#~') && room.charAt(0) !== ',' && randomMoves.length == 1) text = '!dt ';
		this.say(con, room, text + randomMoves.join(', '));
		return randomMoves;
	},
	ri: 'randomitem',
	randitem: 'randomitem',
	randomitem: function(arg, by, room, con) {
		if (this.canUse('randomcommands', room, by) || room.charAt(0) === ',') {
			var text = '';
		} else {
			var text = '/pm ' + by + ', ';
		}
		var types = {"battle":1,"berries":1,"general":1,"hold":1,"medicine":1,"pokeballs":1};
		var itemQuantity = 1;
		var hasBeenSet = false;
		var singleType = false;
		
		var parameters = arg.split(', ');
		if (parameters.length > 10) return this.say(con, room, 'Please use 10 or fewer arguments.');
		for (var i=0; i<parameters.length; i++) {
			if (parameters[i] == parseInt(parameters[i], 10)) {
				if (hasBeenSet) return this.say(con, room, 'Please only specify number of items once');
				if (parameters[i] < 1 || parameters[i] > 6) return this.say(con, room, "Quantity of random items must be between 1 and 6.");
				itemQuantity = parameters[i];
				hasBeenSet = true;
				continue;
			}
			var notGate = false; 
			if (parameters[i].charAt(0) === '!') {
				notGate = true;
				parameters[i] = parameters[i].substr(1);
			}
			var parameter = toId(parameters[i]);
			if (parameter === 'pokeball') parameter = 'pokeballs';
			if (parameter === 'berry') parameter = 'berries';
			if (parameter in types) {
				if (types[parameter] === 1 && !notGate) {
					types[parameter] = 2;
					singleType = true;
				} else if (types[parameter] === 1 && notGate) {
					types[parameter] = 0;
				} else {
					return this.say(con, room, 'Cannot include both \'' + parameters[i] + '\' and \'!' + parameters[i] + '\'.');
				}
			} else if (arg) {
				return this.say(con, room, 'Parameter \'' + parameters[i] + '\' not recognized.');
			}
		}
		if (singleType) {
			for (var set in types) {
				if (types[set] == 1) types[set] = 0;
			}
		}
		
		var randomItems = [];
		var canDex = false;
		for (var j=0; j<itemQuantity; j++) {
			var roll = Math.floor(422 * Math.random()) + 1;
			if (types[Itemdex[roll].type] === 0) {j--; continue;}
			if (randomItems.indexOf(Movedex[roll].name) > -1) {j--; continue;}
			randomItems.push(Itemdex[roll].name);
			if (itemQuantity == 1 && (Itemdex[roll].type === 'hold' || Itemdex[roll].type === 'pokeballs' || Itemdex[roll].type === 'berries')) canDex = true;
		}
		if (randomItems[0] === 'Lucky Egg') canDex = false;
		if (!text && this.hasRank(by, '+%@#~') && room.charAt(0) !== ',' && canDex) text = '!dex ';
		this.say(con, room, text + randomItems.join(', '));
	},
	ra: 'randomability',
	randability: 'randomability',
	randomability: function(arg, by, room, con) {
		if (room.charAt(0) === ',') {
			var text = '';
		} else if (this.canUse('randomcommands', room, by)) {
			var text = '!dt ';
		} else {
			var text = '/pm ' + by + ', ';
		}
		var abilityQuantity = 1;
		var randomAbilities = [];
		var viableOnly = false;
		if (arg) {
			arg = arg.split(", ");
			for (j=0; j<arg.length; j++) {
				if (arg[j] === 'viable') {
					viableOnly = true;
				} else if (arg[j] != parseInt(arg, 10) || arg > 6 || arg < 1) {
					return this.say(con, room, 'Number of abilities must be between 1 and 6.');
				} else {
					abilityQuantity = arg[j];
				}
			}
		}
		for (var i=0; i<abilityQuantity; i++) {
			var roll = Math.floor(192 * Math.random()) + 1;
			if (viableOnly && !Abilitydex[roll].viable) {i--; continue;}
			randomAbilities.push(Abilitydex[roll].name);
		}
		if ((randomAbilities.length > 1 || randomAbilities[0] === 'Cacophony') && text === '!dt ') text = '';
		this.say(con, room, text + randomAbilities.join(', '));
		return randomAbilities;
	},
	cap: function(arg, by, room, con) {
		if (room.charAt(0) === ',' || this.canUse('randomcommands', room, by)) {
			var text = '';
		} else {
			var text = '/pm ' + by + ', ';
		}
		if (arg && (arg != Math.floor(arg) || arg < 150 || arg > 780)) return this.say(con, room, 'Supported range is between 150 and 780.');
		if (!arg) arg = '500-600';
		
		var moveClass = '';
		var type = Commands.randtype.call(this, '', '~art2d2', ',art2d2', con);
		var stats = Commands.randomstats.call(this, arg, '~art2d2', ',art2d2', con);
		var ability = Commands.randomability.call(this, 'viable', '~art2d2', ',art2d2', con);
		if ((stats[1] + 15) < stats[3]) {
			moveClass = ', !physical';
		} else if ((stats[3] + 15) < stats[1]) {
			moveClass = ', !special';
		}
		var move = Commands.randommove.call(this, 'viable' + moveClass, '~art2d2', ',art2d2', con);
		if (type[0] === type[1]) {
			type = type[0];
		} else {
			type = type[0] + '/' + type[1];
		}
		var bst = stats[0] + stats[1] + stats[2] + stats[3] + stats[4] + stats[5];
		this.say(con, room, text + '``Pokemon Concept:`` a **' + type + '** Pokemon with **' + ability + '**. It\'s stats are ``**' + stats.join(', ') + ' (BST: ' + bst + ')**`` and it utilizes __' + move + '__.');
	},
	calc: function(arg, by, room, con) {
		if (room.charAt(0) !== ',' && room !== 'capproject') return false;
		this.say(con, room, 'CAP Damage Calculator: http://sparktrain.github.io/');
	},
	joke: function(arg, by, room, con) {
		if (this.canUse('joke', room, by) || room.charAt(0) === ',') {
			var number = Math.floor((NumOfJokes + 1) * Math.random());
			if (arg && !isNaN(arg) && config.excepts.indexOf(toId(by)) > -1) number = arg;
			if (number == 0) {
				var text = 'Here\'s a joke: ' + by + '';
			} else {
				if (!Jokes[number]) return this.say(con, room, 'Empty joke cell at: ' + number + '. Please report to bot owner.');
				var text = Jokes[number].joke;
			}
			this.say(con, room, text);
		}
	},
	fox: function(arg, by, room, con) {
		if (this.canUse('fox', room, by) || room.charAt(0) === ',') {
			var text = '';
		} else {
			var text = '/pm ' + by + ', ';
		}

		var rand = Math.floor(21 * Math.random()) + 1;

		switch (rand) {
	 		case 1: text += "Yip!"; break;
	  		case 2: text += "Yarp!"; break;
			case 3: text += "Growlf!"; break;
			case 4: text += "Myron?!"; break;
			case 5: text += "/me wags tail"; break;
			case 6: text += "/me bites " + by + ""; break;
			case 7: text += "Yiff~ <3"; break;
			case 8: text += "/me draws furiously"; break;
			case 9: text += ":3"; break;
			case 10: text += ";3"; break;
			case 11: text += "^w^"; break;
			case 12: text += "OwO"; break;
			case 13: text += "=^.~="; break;
			case 14: text += ">:3"; break;
			case 15: text += "/me pounces " + by + ""; break;
			case 16: text += "/me licks " + by + ""; break;
			case 17: text += "Q~Q"; break;
			case 18: text += "``meep``"; break;
			case 19: text += ";w;"; break;
			case 20: text += "rof"; break;
			case 21: text += "Fox is currently broken. Ask again later."; break;
		}
		this.say(con, room, text);
	},
	// Roleplaying commands
	setpoll: function(arg, by, room, con) {
		if (!this.canUse('setrp', room, by) || !(room in this.RP)) return false;
		if (!arg) return this.say(con, room, 'Please enter a strawpoll link.');

		this.RP[room].poll = arg;
		this.say(con, room, 'The poll was set to ' + arg + '.');
	},
	setstream: function(arg, by, room, con) {
		if (!this.canUse('setstream', room, by) || !(room in this.RP)) return false;
		if (arg.split(", ").length !== 2) return this.say(con, room, 'syntax is: \\setstream [host], [link]');
		var host = arg.split(", ")[0];
		var link = arg.split(", ")[1];
		if (!host) return this.say(con, room, 'Please enter a host name.');
		if (!link || !/https?:\/\//.test(link)) return this.say(con, room, 'Please enter a stream http link.');

		this.RP[room].host = host;
		this.RP[room].doc = link;
		this.say(con, room, 'The current stream was set to ' + host + ' hosting ' + link + '.');
	},
	stream: function(arg, by, room, con) {
		if (!(room in this.RP) || room.charAt(0) === ',') return false;
		if (this.RP[room].docCalled) {
			var text = '/pm ' + by + ', ';
		} else {
			var text = '';
			var self = this;
			this.RP[room].docCalled = true;
			setTimeout(function() { delete self.RP[room].docCalled; }, 60 * 1000);
		}
		if (!this.RP[room].doc) return this.say(con, room, text + 'There is no stream set.');
		this.say(con, room, text + this.RP[room].host + ' is hosting the current stream located here: ' + this.RP[room].doc + '.');
	},
	removestream: 'rmstream',
	rmstream: function(arg, by, room, con) {
		if (!this.canUse('setstream', room, by) || !(room in this.RP)) return false;
		if (!this.RP[room].doc) return this.say(con, room, 'There isn\'t a stream to remove. :/');
		this.say(con, room, 'The stream has been removed.');
		delete this.RP[room].doc;
	},
	vgl: 'viewgalleries',
	viewgalleries: function(arg, by, room, con) {
		if (!this.hasRank(by, '@#~')) return false;
		arg = toId(arg);
		var tarRoom = room;

		if (room.charAt(0) === ',') {
			if (!this.hasRank(by, '~')) return false;
			tarRoom = 'global';
		}

		var text = "";
		if (!this.settings.galleries || !this.settings.galleries[tarRoom]) {
			text = "No galleries are uploaded in this room.";
		} else {
			if (arg.length) {
				text = "The user \"" + arg + "\" currently " + (arg in this.settings.galleries ? "has " : "does not have ") + "a gallery."
			} else {
				var galleryList = Object.keys(this.settings.galleries);
				if (!galleryList.length) return this.say(con, room, "No galleries have been added.");
				this.uploadToHastebin(con, room, by, "The following galleries have been added " + (room.charAt(0) === ',' ? "globally" : "in " + room) + ":\n\n" + galleryList.join('\n'))
				return;
			}
		}
		this.say(con, room, text);
	},
	website: 'site',
	site: function(arg, by, room, con) {
		if (config.serverid !== 'showdown') return false;
		if ((this.hasRank(by, '+%@#~') && config.artrooms.indexOf(room) !== -1) || room.charAt(0) === ',') {
			var text = '';
		} else {
			var text = '/pm ' + by + ', ';
		}
		this.say(con, room, text + 'Art Room\'s Website: http://psartroom.weebly.com/');
	},
	references: 'resources',
	tutorials: 'resources',
	resource: 'resources',
	resources: function(arg, by, room, con) {
		if (config.serverid !== 'showdown') return false;
		if ((this.hasRank(by, '+%@#~') && config.artrooms.indexOf(room) !== -1) || room.charAt(0) === ',') {
			var text = '';
		} else {
			var text = '/pm ' + by + ', ';
		}
		this.say(con, room, text + 'A list of tutorials and references can be found here: http://psartroom.weebly.com/references1.html');
	},
	banner: function(arg, by, room, con) {
		if ((this.hasRank(by, '+%@#~') && config.artrooms.indexOf(room) !== -1) || room.charAt(0) === ',') {
			var text = '';
		} else {
			var text = '/pm ' + by + ', ';
		}
		if (arg === toId('youtube')) return this.say(con, room, text + 'YouTube banner formatting here: https://support.google.com/youtube/answer/2972003?hl=en');
		text += 'Room banner dimensions are: 793px x 200px. Please do not make a banner with a pure white or black background.';
		this.say(con, room, text);
	},
	roomintro: function(arg, by, room, con) {
		if (!this.hasRank(by, '#~')) return false;
		arg = arg.split(', ');
		if (arg.length !== 4) return this.say(con, room, 'Syntax is: ``\\roomintro [image link], [caption], [hover text], [current request count]``');
		if (!/https?:\/\//.test(arg[0])) return this.say(con, room, 'please include a http hyperlink');
		if (!/\.(?:png|gif|jpe?g)$/.test(arg[0])) return this.say(con, room, 'Link must be a JPG, GIF, or PNG file.');
		switch (parseInt(arg[3])) {
			case 1: arg[3] = 'http://i.imgur.com/WNAgIau.png'; break;
			case 2: arg[3] = 'http://i.imgur.com/cTgKTr8.png'; break;
			case 3: arg[3] = 'http://i.imgur.com/Zb6rDR1.png'; break;
			case 4: arg[3] = 'http://i.imgur.com/HYRYoVz.png'; break;
			case 5: arg[3] = 'http://i.imgur.com/SrBiKTg.png'; break;
			case 6: arg[3] = 'http://i.imgur.com/xoSUsYQ.png'; break;
			case 7: arg[3] = 'http://i.imgur.com/Mq9HVwT.png'; break;
			case 8: arg[3] = 'http://i.imgur.com/j3vMq7m.png'; break;
			case 9: arg[3] = 'http://i.imgur.com/IPxBNlm.png'; break;
			case 10: arg[3] = 'http://i.imgur.com/hCDDwoc.png'; break;
			default: return this.say(con, room, 'Request number image not found! (invalid range)');
		}
		var intro = '</div><div align="right"><font size=1 color=#585858><em>' +  arg[1] + ' &nbsp;';
		intro += '</em></font></div><center><div title="' + arg[2] + '">';
		intro += '<img src="' + arg[0] + '" width="493" height="120">';
		intro += '<br></div><font size=5>&#8203;</font><img src="http://www.thecloudplayer.com/images/empty.png" width="0" height="35">';
		intro += '<a href="http://psartroom.weebly.com/"><img src="http://i.imgur.com/ymObSSH.gif" width="105" height="30"></a>&nbsp;';
		intro += middleButton + '&nbsp;';
		intro += '<a href="http://psartroom.weebly.com/requests.html"><img src="http://i.imgur.com/0azFwMv.png" width="105" height="30"></a>';
		intro += '<a href="http://psartroom.weebly.com/current-requests.html"><img src="' + arg[3] + '" width="45" height="30"></a>';
		intro += '<div class="infobox"></div>';
		intro += '<div class="broadcast-red">Must be rank <span title="PAWsitive user"><img src="http://woofwarehouse.com/wp-content/plugins/wp-e-commerce/images/paw_white.png" width="12" height="12"></span> or higher to talk right now.</div><div class="infobox"></div>';
		this.uploadToHastebin(con, room, by, "/roomintro " + intro);
	},
	linkhtml: function(arg, by, room, con) {
		if ((this.hasRank(by, '+%@#~') && config.artrooms.indexOf(room) !== -1) || room.charAt(0) === ',') {
			var link = arg.split(',');
			if (!link.length || !/https?:\/\//.test(link[0])) return this.say(con, room, 'please include a http hyperlink')
			if (link.length == 1) {
				this.say(con, room, '<a href="' + link[0] + '">' + link[0] + '</a>');
			} else {
				var caption = link.shift();
				this.say(con, room, '<a href="' + caption + '">' + link.join(":1,") + '</a>');
			}
		}
	},
	rekt: function(arg, by, room, con) {
		if (config.excepts.indexOf(toId(by)) === -1) return false;
		var target = (!arg) ? '!' : ' ' + arg + '!';
		this.say(con, room, 'git foxed on' + target + '');
	},
	solve: function(arg, by, room, con) {
		if (config.excepts.indexOf(toId(by)) === -1) return false;
		if (!arg) arg = 'all the problems';
		this.say(con, room, 'solving ' + arg + ' in progress!');
		this.say(con, room, '' + by + ' has fixed everything!');
	},
	esupport: function(arg, by, room, con) {
		if ((this.canUse('esupport', room, by) && config.artrooms.indexOf(room) !== -1) || room.charAt(0) === ',') {
			var text = '';
		} else {
			var text = '/pm ' + by + ', ';
		}
		if (!arg) {
			this.say(con, room, text + 'I love you, ' + by + '. <3');
		} else if (toId(arg) === toId(config.nick)) {
			this.say(con, room, text + 'Thank you ' + by + '. ^w^');
		} else {
			this.say(con, room, text + 'I love you, ' + arg + '. <3');
		}
	},
	setgallery: function(arg, by, room, con) {
		var tarRoom = room;
		if (!this.settings.galleries) this.settings.galleries = {};
		if ((this.hasRank(by, '%@#~') && config.artrooms.indexOf(room) !== -1)) {
			if (!this.settings.galleries[tarRoom]) this.settings.galleries[tarRoom] = {};
			if (arg.split(", ").length !== 2) return this.say(con, room, 'Syntax is: \\gallery [user], [link]');
			var user = toId(arg.split(", ")[0]);
			var link = arg.split(", ")[1];
			if (user.length < 1 || user.length > 18) return this.say(con, room, 'That\'s not a real username! ;w;');
			if (user === toId(config.nick)) return this.say(con, room, 'What? ;w; I\'m a robot! I can\'t draw.');
			if (!/https?:\/\//.test(link)) return this.say(con, room, 'Link must include http.');
			if (!this.settings.galleries[user]) this.settings.galleries[user] = {};
			this.settings.galleries[user]['link'] = link;
			this.writeSettings();
			this.say(con, room, '/modnote ' + user + '\'s gallery has been set to: ' + link + ' by ' + by + '.');
		}
	},
	gallery: function(arg, by, room, con) {
		if ((this.hasRank(by, '+%@#~') && config.artrooms.indexOf(room) !== -1) || room.charAt(0) === ',') {
			var text = '';
		} else {
			var text = '/pm ' + by + ', ';
		}
		if (!arg) return this.say(con, room, text + 'Please specify whose gallery you are looking for.');
		if (arg === 'all') return this.say(con, room, text + 'A list of user galleries can be found here: http://psartroom.weebly.com/user-galleries.html');
		var user = toId(arg);
		if (user.length < 1 || user.length > 18) return this.say(con, room, 'That\'s not a real username! ;w;');
		if (user === 'bottt') return this.say(con, room, text + 'BoTTT can\'t draw silly. :P');
		if (!this.settings.galleries[user]) return this.say(con, room, '' + text + 'There is no gallery set for ' + arg + '.');
		var link = this.settings.galleries[user]['link'];
		this.say(con, room, text + arg + '\'s gallery: ' + link);
	},
	rmgallery: function(arg, by, room, con) {
		if ((this.hasRank(by, '%@#~') && config.artrooms.indexOf(room) !== -1)) {
			if (!arg) return this.say(con, room, 'Please specify whose gallery you would like to remove.');
			var user = toId(arg);
			if (!this.settings.galleries[user]) return this.say(con, room, 'There is no gallery set for ' + arg + '.');
			delete this.settings.galleries[user];
			this.say(con, room, arg + '\'s gallery has been removed.');
		}
	},
	alarm: 'remind',
	remind: function(arg, by, room, con) {
		if (room.charAt(0) === ',' || this.hasRank(by, '#~')) {
			arg = arg.split(', ');
			if (!arg[1]) return this.say(con, room, 'You forgot the message!');
			var message = arg[1];
			if (arg[0].indexOf(':') > 0) {
				var hours = toId(arg[0].split(':')[0]);
				var minutes = toId(arg[0].split(':')[1]);
				if (isNaN(hours) || isNaN(minutes)) return this.say(con, room, 'Error: HH:MM notation did not use numbers.');
				var time = hours * 60 * 60 * 1000;
				time += minutes * 60 * 1000;
			} else {
				var time = 1000 * 60;
				var timeArg = arg[0].split('*');
				for (i=0; i<timeArg.length; i++) {
					if (isNaN(timeArg[i])) return this.say(con, room, 'Time must be given in minutes');
					time *= timeArg[i].replace(' ', '');
				}
			}
			if (time > 1000 * 60 * 60 * 24) return this.say(con, room, 'Timer must not exceed 24 hours');
			if (isNaN(time) || time <= 0) return this.say(con, room, 'Invalid time.');
			var self = this;
			setTimeout(function(){
				self.say(con, room, by + ': ' + message);
			}, time);
			this.say(con, room, ((room.charAt(0) === ',') ? '' : '/msg ' + by + ', ') + 'Reminder has been set for ' + time / (60 * 1000) + ' minutes from now.');
		}
	},
	dapoints: function(arg, by, room, con) {
		if ((config.artrooms.indexOf(room) !== -1) || room.charAt(0) === ',') {
			if (arg.charAt(0) === '$') {
				arg = arg.substr(1);
				if (isNaN(arg)) return this.say(con, room, 'Dollar amount must be a number.');
				var worth = (Math.floor(arg * DAdollar));
				this.say(con, room, '$' + arg + ' (USD) is worth ' + worth + ' DeviantArt points.');
			} else if (arg.charAt(0) === '€') {
				arg = arg.substr(1);
				if (isNaN(arg)) return this.say(con, room, 'Euro ammount must be a number.');
				var worth = (Math.floor(arg * DAeuro));
				this.say(con, room, '€' + arg + ' is worth ' + worth + ' DeviantArt points.');
			} else if (arg.charAt(0) === '£') {
				arg = arg.substr(1);
				if (isNaN(arg)) return this.say(con, room, 'Pound ammount must be a number.');
				var worth = (Math.floor(arg * DApound));
				this.say(con, room, '£' + arg + ' is worth ' + worth + ' DeviantArt points.');
			} else {
				if (isNaN(arg)) return this.say(con, room, 'DA point ammount must be a number.');
				var worth = (Math.floor(arg / (DAdollar * 1.25) * 100)) / 100;
				this.say(con, room, '' + arg + ' DeviantArt points are worth $' + worth.toFixed(2) + '. (in USD)');
			}
		}
	},
	image: 'getimage',
	getimage: function(arg, by, room, con) {
		if (room.charAt(0) === ',' || this.hasRank(by, '@#~')) {
			var text = '';
		} else {
			var text = '/pm ' + by + ', ';
		}
		arg = arg.split(', ');
		if (toId(arg[0]) === 'resize' || toId(arg[0]) === 'html' || toId(arg[0]) === 'time') {
			var cmd = toId(arg[0]);
		} else {
			var cmd = '';
		}
		if ((!cmd && arg.length > 1) || arg.length > 2) return this.say(con, room, text + 'Synax is: ``\\getimage [resize, html, time], {link}``');
		var link = (!cmd) ? arg[0] : arg[1];
		if (!/^https?:\/\//.test(link)) return this.say(con, room, text + 'Link must use HTTP or HTTPS.');
		if (!/\.(?:png|gif|jpe?g|bmp|psd)$/.test(link)) return this.say(con, room, text + 'Link must be a JPG, GIF, or PNG file.');

		var size = this.getImageSize(link)
		var self = this;
		var attempts = 0;
		console.log('Initializing image loading');
		var timerID = setInterval(function() { 
			if (global.ImageSize.width != 0) {
				var w = global.ImageSize.width;
				var h = global.ImageSize.height;
				if (!w || !h) return self.say(con, room, text + 'Could not find the dimensions of image.');
				if (cmd === 'resize') {
					var c = 0;
					if (w > 500) {
						c = w / 500;
						w = 500;
						h = Math.floor(h / c);
					} else if ( h > 500) {
						c = h / 500;
						h = 500;
						w = Math.floor(w / c);
					}
					text = (room.charAt(0) === ',' ? '' : ('/pm ' + by + ', '));
					self.say(con, room, text + '!showimage ' + link  + ', ' + w + ', ' + h);
				} else if (cmd === 'html') {
					self.say(con, room, text + '<img src="' + link + '" width="' + w + '" height="' + h + '">');
				} else {
					self.say(con, room, text + 'Image dimensions are ' + w + ' x ' + h + '.');
				}
				if (cmd === 'time') self.say(con, room, text + 'Image took less than ' + (attempts / 10) + ' seconds to load.');
				console.log('Succesfully loaded image.');
				clearInterval(timerID);
			}
			if (attempts > 100) {
				self.say(con, room, text + 'Image loading timed out! Purhaps the image file is too large! D:');
				console.log('Error: loading timed out');
				clearInterval(timerID);
			}
			attempts++
		}, 100)
	},
	randstats: 'randomstats',
	rs: 'randomstats',
	randomstats: function(arg, by, room, con) {
		if (this.canUse('randomcommands', room, by) || room.charAt(0) === ',') {
			var text = '';
		} else {
			var text = '/pm ' + by + ', ';
		}
		var stat = [0,0,0,0,0,0];
		var currentST = 0;
		var leveler = (Math.floor(5 * Math.random()) + 2);
		if (!arg) {
			var bstMin = 200;
			var bstMax = 780
		} else {
			if (isNaN(arg.charAt(0))) return this.say(con, room, 'Syntax is: ``\\randstats [BST min]-[BST max]``');
			arg = arg.split('-');
			if (arg.length == 1) {
				bstMin = parseInt(arg);
				bstMax = parseInt(arg);
			} else if (arg.length == 2) {
				bstMin =  parseInt(arg[0]);
				bstMax =  parseInt(arg[1]);
			} else {
				return this.say(con, room, 'Syntax is: ``\\randstats [BST min]-[BST max]``');
			}
		}
		if (bstMin != parseInt(bstMin, 10) || bstMin < 150) return this.say(con, room, "Specified BST must be a whole number between 150 and 780.");
		if (bstMax != parseInt(bstMax, 10) || bstMin > 780) return this.say(con, room, "Specified BST must be a whole number between 150 and 780.");
		if (bstMax < bstMin) return this.say(con, room, 'Invalid range');
		var bst = (Math.floor((bstMax - bstMin) * Math.random()) + bstMin);
		
		for (j=0; j<leveler; j++) {
			for (i=0; i<6; i++) {
				var randomPart = Math.floor((bst / ( leveler * 3 )) * Math.random()) + 1;
				if (randomPart < (20 / leveler)) randomPart = Math.floor(20 / leveler);
				stat[i] += randomPart;
				currentST += randomPart;
			}
		}
		console.log('stats: ' + stat + ' BST: (' + currentST + ') | Leveler: ' + leveler + ' | target BST: ' + bst);
		if (currentST > bst) {
			for (k=currentST; k>bst; k--) {
				stat[Math.floor(6 * Math.random())] -= 1;
			}
		} else if (currentST < bst) {
			for (k=currentST; k<bst; k++) {
				stat[Math.floor(6 * Math.random())] += 1;
			}
		}
		
		ranStats = this.shuffle(stat);
		text += 'Random stats: HP:**' + ranStats[0] + '** Atk:**' + ranStats[1] + '** Def:**' + ranStats[2] + '** SpA:**' + ranStats[3] +
				'** SpD:**' + ranStats[4] + '** Spe:**' + ranStats[5] + '** BST:**' + bst + '**';
		this.say(con, room, text);
		return ranStats;
	},
	dd: 'dailydraw',
	dailydraw: function(arg, by, room, con) {
		if (room.charAt(0) === ',' || this.hasRank(by, '+%@#~')) {
			var text = '';
		} else {
			var text = '/msg ' + by + ', ';
		}
		if (!this.settings.dd) this.settings.dd = 'There is no Daily Draw currently set.';
		if (!arg) {
			return this.say(con, room, text + this.settings.dd);
		} else if (toId(arg) === 'ideas') {
			if (this.hasRank(by, '+%@#~')) {
				if (room.charAt(0) !== ',') text = '/msg ' + by + ', ';
				return this.say(con, room, text + 'https://docs.google.com/document/d/1YfQ_h5Un7FpRPLdjKHlSqD9a8cYRHI9B5gwBoayaQjU/edit');
			} else {
				return this.say(con, room, text + 'PM a room auth if you have an idea for a Daily Draw.');
			}
		} else if (toId(arg) === 'info') {
			return this.say(con, room, text + '**Daily Draw** is a room activity wherein you make a short sketch or speedpaint of the listed activity to practice your skills and creativity. ' + 
					'Use ``\\dd posts`` to share a link to your drawing or to look at what others have made.');
		} else if (arg.substr(0, 5).toLowerCase()  === 'set, ') {
			if (!this.hasRank(by, '@#~') && !toId(by) === 'bummer') return this.say(con, room, 'Requires @.');
			if (room.charAt(0) === ',') return this.say(con, room, '\\dd set cannot be used in pm.');
			this.settings.dd = arg.charAt(5).toUpperCase() + arg.substr(6);
			this.writeSettings();
			console.log('Daily Draw set by ' + by);
			return this.say(con, room, 'The Daily Draw has been set!');
		} else if (toId(arg) === 'posts') {
			return this.say(con, room, text + 'http://bit.ly/DailyDoodle');
		} else {
			this.say(con, room, text + 'Valid Daily Draw commands are ``info``, ``ideas``, and ``posts``.');
		}
	},
	randpalette: 'randompalette',
	randompalette: function(arg, by, room, con) {
		if (this.canUse('randomcommands', room, by) || room.charAt(0) === ',') {
			var text = '';
		} else {
			var text = '/pm ' + by + ', ';
		}
		this.say(con, room, text + 'www.colourpod.com/random');
	},
	
	//Mail related commands
	mail: 'message',
	msg: 'message',
	message: function(arg, by, room, con) {
		if (!this.settings.roompaw[toId(by)]) {
			if (!this.canUse('message', room, by)) return this.say(con, room, '/msg ' + by + ', \\mail is only avalible to users ' + this.settings["message"]["art"] + ' and above and those with "roompaw".');
		}
		var user = toId(arg.split(', ')[0]);
		if (user.length > 18) return this.say(con, room, 'That\'s not a real username! >:I');
		var message = by + ': ' + arg.substr(arg.split(', ')[0].length + 2);
		if (message.length < by.length + 3) return this.say(con, room, 'You forgot to include the message! D:');
		if (message.length > 300) return this.say(con, room, 'Your message was just slightly too long. ;w;');
		if (['bottt','art2d2','roleplayingbot','thescribe'].indexOf(user) > -1) return this.say(con, room, '/me chews up mail.');
		if (!this.messages) this.messages = {};
		if (!this.messages[user]) {
			this.messages[user] = {};
			this.messages[user].timestamp = Date.now();
		}
		if (this.messages[user]["4"]) return this.say(con, room, user + '\'s message inbox is full.');
		var msgNumber = -1;
		for (var i in this.messages[user]) {
			msgNumber++;
		}
		msgNumber = "" + msgNumber;
		this.messages[user][msgNumber] = message;
		this.writeMessages();
		this.say(con, room, (room.charAt(0) === ',' ? '' : '/pm ' + by + ', ') + 'message has been sent to ' + user + '.');
	},
	mailbox: 'readmessages',
	checkmail: 'readmessages',
	readmail: 'readmessages',
	readmessages: function(arg, by, room, con) {
		var text = (room.charAt(0) === ',' ? '' : '/pm ' + by + ', ');
		if (!this.messages[toId(by)]) return this.say(con, room, text + 'Your inbox is empty.');
		for (var msgNumber in this.messages[toId(by)]) {
			if (msgNumber === 'timestamp') continue;
			this.say(con, room, text + this.messages[toId(by)][msgNumber]);
		}
		delete this.messages[toId(by)];
		this.writeMessages();
	},
	clearmail: 'clearmessages',
	clearmessages: function(arg, by, room, con) {
		if (!this.hasRank(by, '#~')) return false;
		if (!arg) return this.say(con, room, 'Specify whose mail to clear or \'all\' to clear all mail.');
		if (!this.messages) return this.say(con, room, 'The message file is empty.');
		if (arg === 'all') {
			this.messages = {};
			this.writeMessages();
			this.say(con, room, 'All messages have been erased.');
		} else if (arg.substr(0,4) === 'time') {
			var dayNumber = MESSAGES_TIME_OUT;
			if (arg.charAt(4) === ',') {
				dayNumber = (arg.substr(5).replace(/\s/, "")) * 24 * 60 * 60 * 1000;
				if (isNaN(dayNumber)) return this.say(con, room, 'Syntax is: ``\\clearmail time, [number of days]``');
			}
			for (var user in this.messages) {
				if (this.messages[user]["timestamp"] < (Date.now() - dayNumber)) delete this.messages[user];
			}
			this.writeMessages();
			this.say(con, room, 'Messages older than ' + (dayNumber / (24 * 60 * 60 * 1000)) + ' days have been erased.');
		} else {
			var user = toId(arg);
			if (!this.messages[user]) return this.say(con, room, user + ' does not have any pending messages.');
			delete this.messages[user];
			this.writeMessages();
			this.say(con, room, 'Messages for ' + user + ' have been erased.');
		}
	},
	countmessages: 'countmail',
	countmail: function(arg, by, room, con) {
		if (!this.hasRank(by, '#~')) return false;
		if (!this.messages) this.say(con, room, 'Messages.JSON is empty');
		var messageCount = 0;
		var oldestMessage = Date.now();
		for (var user in this.messages) {
			for (var message in this.messages[user]) {
				if (message === 'timestamp') { 
					if (this.messages[user]['timestamp'] < oldestMessage) oldestMessage = this.messages[user]['timestamp'];
					continue;
				}
				messageCount++;
			}
		}
		//convert oldestMessage to days
		var day = Math.floor((Date.now() - oldestMessage) / (24 * 60 * 60 * 1000));
		this.say(con, room, 'There are currently **' + messageCount + '** pending messages. The oldest message ' + (!day ? 'was left today.' : 'is __' + day + '__ days old.'));
	},
	pawpromote: 'roompaw',
	roompaw: function(arg, by, room, con) {
		if (!this.hasRank(by, '@#~') || room.charAt(0) === ',') return false;
		if (!arg) return this.say(con, room, 'Who shall be roompaw\'d?');
		var users = arg.split(', ');
		var errors = [];
		if (!this.settings.roompaw) this.settings.roompaw = {};
		for (var i=0; i<users.length; i++) {
			var user = toId(users[i]);
			if (this.settings.roompaw[user]) { 
				errors.push(users[i]); 
				users.splice(i, 1);
				continue;
			}
			this.settings.roompaw[user] = 1;
		}
		this.writeSettings();
		if (errors.length != 0) this.say(con, room, errors.join(', ') + (errors.length > 1 ? ' are' : ' is') + ' already Roompaw\'d.');
		if (users.length != 0) { 
			this.say(con, room, users.join(', ') + ' has been promoted to Roompaw!');
			this.say(con, room, '/modnote ' + users.join(', ') + ' has been given roompaw by ' + toId(by));
		}
	},
	roomunpaw: function(arg, by, room, con) {
		if (!this.hasRank(by, '@#~') || room.charAt(0) === ',') return false;
		if (!arg) return this.say(con, room, 'Whose roompaw should be remove?');
		var user = toId(arg);
		if (!this.settings.roompaw) this.settings.roompaw = {};
		if (!this.settings.roompaw[user]) return this.say(con, room, arg + ' does not have Roompaw.');
		delete this.settings.roompaw[user];
		this.writeSettings();
		this.say(con, room, '/modnote ' + user + ' has roompaw removed by ' + toId(by));
	},
	vrp: 'viewroompaw',
	viewroompaw: function(arg, by, room, con) {
		if (!this.hasRank(by, '@#~') || room.charAt(0) === ',') return false;
		if (!this.settings.roompaw) return this.say(con, room, 'No users are roompaw\'d.');
		var roompawList = Object.keys(this.settings.roompaw);
		this.uploadToHastebin(con, room, by, "The following users have Roompaw:\n\n" + roompawList.join('\n'));
		return;
	}
}