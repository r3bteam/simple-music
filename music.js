const Discord = require("discord.js");
const client = new Discord.Client();
const ytdl = require('ytdl-core');
const request = require('request');
const devs = ['171259176029257728'];
const fs = require('fs');
const getYoutubeID = require('get-youtube-id');
const fetchVideoInfo = require('youtube-info');
const yt_api_key = "AIzaSyDeoIH0u1e72AtfpwSKKOSy3IPp2UHzqi4";
const prefix = 'm-';
client.login(process.env.SECERT_KEY);


var servers = [];
var queue = [];
var guilds = [];
var queueNames = [];
var isPlaying = false;
var dispatcher = null;
var voiceChannel = null;
var skipReq = 0;
var skippers = [];
var now_playing = [];
/*
\\\\\\\\\\\\\\\\\\\\\\\\/////////////////////////
\\\\\\\\\\\\\\\\\\\\\\\\/////////////////////////
\\\\\\\\\\\\\\\\\\\\\\\\/////////////////////////
\\\\\\\\\\\\\\\\\\\\\\\\/////////////////////////
*/
client.on('ready', () => {});
console.log("Logged")
var download = function(uri, filename, callback) {
	request.head(uri, function(err, res, body) {
		console.log('content-type:', res.headers['content-type']);
		console.log('content-length:', res.headers['content-length']);
        client.user.setActivity(`m-play | ${client.guilds.size} servers`)
		request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
	});
};

client.on('message', function(message) {
    const noms = "** ❯ :musical_note: No music is playing, try ``m-play``" 
    const novc = "**<:no:439399928960253964> | You are not in a voice channel.**"
	const member = message.member;
	const mess = message.content.toLowerCase();
	const args = message.content.split(' ').slice(1).join(' ');


//
function skip_song(message) {
    if (!message.member.voiceChannel) return message.reply(novc);
    dispatcher.end();
}

function playMusic(id, message) {
    voiceChannel = message.member.voiceChannel;
    voiceChannel.join().then(function(connectoin) {
        let stream = ytdl('https://www.youtube.com/watch?v=' + id, {
            filter: 'audioonly'
        });
        skipReq = 0;
        skippers = [];

        dispatcher = connectoin.playStream(stream);
        dispatcher.on('end', function() {
            skipReq = 0;
            skippers = [];
            queue.shift();
            queueNames.shift();
            if (queue.length === 0) {
                queue = [];
                queueNames = [];
                isPlaying = false;
            }
            else {
                setTimeout(function() {
                    playMusic(queue[0], message);
                    message.channel.send(`**Now Playing :notes: \`\`${now_playing}\`\`**`)
                }, 500);
            }
        });
    });
}


function getID(str, cb) {
    if (isYoutube(str)) {
        cb(getYoutubeID(str));
    }
    else {
        search_video(str, function(id) {
            cb(id);
        });
    }
}

function add_to_queue(strID) {
    if (isYoutube(strID)) {
        queue.push(getYoutubeID(strID));
    }
    else {
        queue.push(strID);
    }
}

function search_video(query, cb) {
    request("https://www.googleapis.com/youtube/v3/search?part=id&type=video&q=" + encodeURIComponent(query) + "&key=" + yt_api_key, function(error, response, body) {
        var json = JSON.parse(body);
        cb(json.items[0].id.videoId);
    });
}


function isYoutube(str) {
    return str.toLowerCase().indexOf('youtube.com') > -1;
}
//
    
	if (mess.startsWith(prefix + 'play')) {
		if (!message.member.voiceChannel) return message.reply(novc);
		if (args.length == 0) return message.channel.send(`:musical_note: ❯ m-play **Youtube URL / Search**`)
		if (queue.length > 0 || isPlaying) {
			getID(args, function(id) {
				add_to_queue(id);
				fetchVideoInfo(id, function(err, videoInfo) {
					if (err) throw new Error(err);
					let play_info = new Discord.RichEmbed()
						.setAuthor("Added to queue", message.author.avatarURL)
						.setDescription(`**${videoInfo.title}**`)
						.setColor("RANDOM")
						.setFooter('Requested By ' + message.author.tag)
						.setImage(videoInfo.thumbnailUrl)
					message.channel.send(play_info);
					queueNames.push(videoInfo.title);
					// let now_playing = videoInfo.title;
					now_playing.push(videoInfo.title);
				});
			});
        }

		else {
			isPlaying = true;
			getID(args, function(id) {
				queue.push('placeholder');
				playMusic(id, message);
				fetchVideoInfo(id, function(err, videoInfo) {
					if (err) throw new Error(err);
					message.channel.send(`**Playing :notes: \`\`${videoInfo.title}\`\` - Now!**`);
				});
			});
		}
    }

	else if (mess.startsWith(prefix + 'skip')) {
        if (!message.member.voiceChannel) return message.reply(novc);
        if(!isPlaying || !queue.length < 0) return message.reply(noms)
        if(message.member.hasPermission('MANAGE_CHANNELS')) {
		message.channel.send('**:fast_forward: Skipped**').then(() => {
			skip_song(message);
			var server = server = servers[message.guild.id];
            if (!isPlaying || !queue) message.guild.voiceConnection.disconnect();
        });
      } else {
        skipReq + 1
        message.channel.send(`**:point_up::skin-tone-1: ${message.author.username} is voting to skip this song.** ${skipReq}/5`)
        if(skipReq >= 5) {
            message.channel.send('**:fast_forward: Skipped**').then(() => {
                skip_song(message);
                var server = server = servers[message.guild.id];
                if (!isPlaying || !queue) message.guild.voiceConnection.disconnect();
            });
        }
      }
    }
    
	else if (message.content.startsWith(prefix + 'vol')) {
        return message.channel.send(new Discord.RichEmbed().setDescription("**You must have Premium to use this command!**"))
        if (!message.member.voiceChannel) return message.reply(novc);
		if (args > 100) return message.reply(':x: **100**');
		if (args < 1) return message.reply(":x: **1**");
		dispatcher.setVolume(1 * args / 50);
		message.channel.sendMessage(`Volume Updated To: **${dispatcher.volume*50}**`);
    }
    
	else if (mess.startsWith(prefix + 'pause')) {
		if (!message.member.voiceChannel) return message.reply(novc);
		message.reply(':pause_button: **Paused**').then(() => {
			dispatcher.pause();
		});
    }
    
	else if (mess.startsWith(prefix + 'resume')) {
		if (!message.member.voiceChannel) return message.reply(novc);
		message.reply(':play_pause: **Resuming**').then(() => {
			dispatcher.resume();
		});
    }
    
	else if (mess.startsWith(prefix + 'stop')) {
		if (!message.member.voiceChannel) return message.reply(novc);
		message.reply(':name_badge: **تم الايقاف**');
		var server = server = servers[message.guild.id];
		if (message.guild.voiceConnection) message.guild.voiceConnection.disconnect();
    }
    
	else if (mess.startsWith(prefix + 'join')) {
		if (!message.member.voiceChannel) return message.reply(novc);
		message.member.voiceChannel.join().then(message.react('✅'));
	}
});