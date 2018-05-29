const Discord = require("discord.js");
const client = new Discord.Client();
const ytdl = require("ytdl-core");
const request = require("request");
const convert = require("hh-mm-ss")
const fs = require("fs");
const getYouTubeID = require("get-youtube-id");
const fetchVideoInfo = require("youtube-info");
const yt_api_key = "AIzaSyDeoIH0u1e72AtfpwSKKOSy3IPp2UHzqi4"
const prefix = "m-";
client.login(process.env.SECERT_KEY);
var guilds = {};

/////////////////////////////////////////////////////////////////////////////////

client.on('message', function(message) {
    const noms = "** ❯ :musical_note: No music is playing, try ``m-play``" 
    const novc = "**<:no:439399928960253964> | You are not in a voice channel.**"
    const member = message.member;
    const mess = message.content.toLowerCase();
    const args = message.content.split(' ').slice(1).join(" ");

    if (!guilds[message.guild.id]) {
        guilds[message.guild.id] = {
            queue: [],
            queueNames: [],
            isPlaying: false,
            dispatcher: null,
            voiceChannel: null,
            skipReq: 0,
            skippers: [],
        };
    }

    if (mess.startsWith(prefix + "play")) {
        if (message.member.voiceChannel || guilds[message.guild.id].voiceChannel != null) {
 		if (args.length == 0 || !args) return message.channel.send(`:musical_note: ❯ m-play **Youtube URL / Search**`)
            if (guilds[message.guild.id].queue.length > 0 || guilds[message.guild.id].isPlaying) {
                getID(args, function(id) {
                    add_to_queue(id, message);
                    fetchVideoInfo(id, function(err, videoInfo) {
                        if (err) throw new Error(err);
                        message.channel.send(new Discord.RichEmbed()
                        .setAuthor("Added to queue", message.author.avatarURL)
                        .setTitle(videoInfo.title)
                        .setURL(videoInfo.url)
                        .addField("Channel", videoInfo.owner, true)
                        .addField("Duration", convert.fromS(videoInfo.duration, 'mm:ss') , true)
                        .addField("Published at", videoInfo.datePublished, true)
                        .addField("Postion in queue", guilds[message.guild.id].queueNames.length, true)
						.setColor("RED")
						.setThumbnail(videoInfo.thumbnailUrl)
                        )
                        guilds[message.guild.id].queueNames.push(videoInfo.title);
                    });
                });
            } else {
                isPlaying = true;
                getID(args, function(id) {
                    guilds[message.guild.id].queue.push(id);
                    playMusic(id, message);
                    fetchVideoInfo(id, function(err, videoInfo) {
                        if (err) throw new Error(err);
                        guilds[message.guild.id].queueNames.push(videoInfo.title);
                        message.channel.send(`**Playing :notes: \`\`${videoInfo.title}\`\` - Now!**`);
                    });
                });
            }
        } else {
            message.reply(novc);
        }

    } else if (mess.startsWith(prefix + "skip")) {
        if(!member.voiceChannel) return message.reply(novc)
        if (guilds[message.guild.id].skippers.indexOf(message.author.id) === -1) {
            guilds[message.guild.id].skippers.push(message.author.id);
            guilds[message.guild.id].skipReq++;
            if (guilds[message.guild.id].skipReq >= Math.ceil((guilds[message.guild.id].voiceChannel.members.size - 1) / 2)) {
                skip_song(message);
                message.channel.send("**:fast_forward: Skipped**");
                if (!guilds[message.guild.id].isPlaying) message.guild.voiceConnection.disconnect();
            } else {
                message.channel.send(`**:point_up::skin-tone-1: ${message.author.username} has vote to skip current song! **` + Math.ceil((guilds[message.guild.id].voiceChannel.members.size - 1) / 2) - guilds[message.guild.id].skipReq) = "**  more votes to skip! **";
            }
        } else {
            message.reply("<:no:439399928960253964> you already voted to skip!");
        }

//      if (mess.startsWith(prefix+"search")) {
//         try {
//             var videos = await youtube.searchVideos(searchString, 10);
//             let index = 0;
//             msg.channel.send(`
// __**Song selection:**__
// ${videos.map(video2 => `**${++index} -** ${video2.title}`).join('\n')}
// Please provide a value to select one of the search results ranging from 1-10.
//             `);
//             // eslint-disable-next-line max-depth
//             try {
//                 var response = await msg.channel.awaitMessages(msg2 => msg2.content > 0 && msg2.content < 11, {
//                     maxMatches: 1,
//                     time: 10000,
//                     errors: ['time']
//                 });
//             } catch (err) {
//                 console.error(err);
//                 return msg.channel.send('No or invalid value entered, cancelling video selection.');
//             }
//             const videoIndex = parseInt(response.first().content);
//             var video = await youtube.getVideoByID(videos[videoIndex - 1].id);
//         } catch (err) {
//             console.error(err);
//             return msg.channel.send('🆘 I could not obtain any search results.');
//         }
//     }
//     return handleVideo(video, msg, voiceChannel);

    } else if (mess.startsWith(prefix + "queue")) {
        if(guilds[message.guild.id].queueNames.length < 1) return message.channel.send(`**:x: Nothing playing in this server**`)
        var message2 = "```";
        for (var i = 0; i < guilds[message.guild.id].queueNames.length; i++) {
            var temp = (i + 1) + ": " + guilds[message.guild.id].queueNames[i] + (i === 0 ? "(Current Song)" : "") + "\n";
            if ((message2 + temp).length <= 2000 - 3) {
                message2 += temp;
            } else {
                message2 += "```";
                message.channel.send(message2);
                message2 = "```";
            }
        }
        message2 += "```";
        message.channel.send(message2);
    }

if(mess.startsWith(prefix+"stop")) {
    if (!message.member.voiceChannel) return message.reply(novc);
    message.channel.send('**:mailbox_with_no_mail: Successfully disconnected**');
    if(guilds[message.guild.id].isPlaying) guilds[message.guild.id].dispatcher.end();
    if (guilds[message.guild.id].voiceChannel)
    { message.guild.voiceConnection.disconnect()
    guilds[message.guild.id].queue = [];
    guilds[message.guild.id].queueNames = [];
    guilds[message.guild.id].isPlaying = false;
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




//
client.on('ready', function() {
    console.log("I am ready!");
});

function skip_song(message) {
    guilds[message.guild.id].dispatcher.end();
}

function playMusic(id, message) {
    guilds[message.guild.id].voiceChannel = message.member.voiceChannel;
    guilds[message.guild.id].voiceChannel.join().then(function(connection) {
        stream = ytdl("https://www.youtube.com/watch?v=" + id, {
            filter: 'audioonly'
        });
        guilds[message.guild.id].skipReq = 0;
        guilds[message.guild.id].skippers = [];

        guilds[message.guild.id].dispatcher = connection.playStream(stream);
        guilds[message.guild.id].dispatcher.on('end', function() {
            guilds[message.guild.id].skipReq = 0;
            guilds[message.guild.id].skippers = [];
            guilds[message.guild.id].queue.shift();
            guilds[message.guild.id].queueNames.shift();
            if (guilds[message.guild.id].queue.length === 0) {
                guilds[message.guild.id].queue = [];
                guilds[message.guild.id].queueNames = [];
                guilds[message.guild.id].isPlaying = false;
                message.guild.voiceConnection.disconnect();
            } else {
                setTimeout(function() {
                    playMusic(guilds[message.guild.id].queue[0], message);
                   message.channel.send(`**Playing :notes: \`\`${guilds[message.guild.id].queueNames}\`\` - Now!**`)
                }, 500);
            }
        });
    });
}

function getID(str, cb) {
    if (isYoutube(str)) {
        cb(getYouTubeID(str));
    } else {
        search_video(str, function(id) {
            cb(id);
        });
    }
}

function add_to_queue(strID, message) {
    if (isYoutube(strID)) {
        guilds[message.guild.id].queue.push(getYouTubeID(strID));
    } else {
        guilds[message.guild.id].queue.push(strID);
    }
}

function search_video(query, callback) {
    request("https://www.googleapis.com/youtube/v3/search?part=id&type=video&q=" + encodeURIComponent(query) + "&key=" + yt_api_key, function(error, response, body) {
        var json = JSON.parse(body);
        if (!json.items[0]) callback("3_-a9nVZYjk");
        else {
            callback(json.items[0].id.videoId);
        }
    });
}

function isYoutube(str) {
    return str.toLowerCase().indexOf("youtube.com") > -1;
}