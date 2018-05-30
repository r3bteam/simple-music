const Discord = require("discord.js");
const client = new Discord.Client({disableEveryone: true});
const ytdl = require("ytdl-core");
const devs = ["340653929429729281" , "171259176029257728" , "349124522747887616" , "447804943454175232"]
const request = require("request");
const convert = require("hh-mm-ss")
const fs = require("fs");
const getYouTubeID = require("get-youtube-id");
const fetchVideoInfo = require("youtube-info");
const yt_api_key = "AIzaSyDeoIH0u1e72AtfpwSKKOSy3IPp2UHzqi4"
const prefix = "m-";
client.login(process.env.SECERT_KEY);
var guilds = {};
client.on('ready', function() {
    console.log("[Launching...] Matrix Premium Music Bot V0.9");
});
client.on('reconnecting', function() {
    console.log("[Reconnting...] Matrix Premium Music Bot V0.9");
});
client.on('disconnect', function() {
    console.log("[Disconnecting...] Matrix Premium Music Bot V0.9");
});
/////////////////////////////////////////////////////////////////////////////////

client.on('message', async function(message) {
    const noms = "** ❯ :musical_note: No music is playing, try ``m-play``" 
    const novc = "**<:no:439399928960253964> | You are not in a voice channel.**"
    const nomatch = "**:MxNo: You've to be in the same voice channel!**"
    const yt = "<:MxYT:451042476552355841>"
    const correct = client.guilds.get('448425456316973057').emojis.get("451040030635458574")
    const nope = client.guilds.get('448425456316973057').emojis.get('451040031277056001')
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

    function clear() { 
        guilds[message.guild.id].queue = [];
        guilds[message.guild.id].queueNames = [];
        guilds[message.guild.id].isPlaying = false;
        guilds[message.guild.id].dispatcher = null
        guilds[message.guild.id].voiceChannel = null;
        guilds[message.guild.id].skipReq = 0;
        guilds[message.guild.id].skipReq = [];
    }


    if (mess.startsWith(prefix + "play")) {
        if (message.member.voiceChannel || guilds[message.guild.id].voiceChannel != null) {
 		if (args.length == 0 || !args) return message.channel.send(`:musical_note: ❯ m-play **Youtube URL / Search**`)
            if (guilds[message.guild.id].queue.length > 0 || guilds[message.guild.id].isPlaying) {
                message.channel.send(`**${yt} Searching :mag_right: \`\`${args}\`\`**`).then((msg)=> {
                getID(args, function(id) {
                    fetchVideoInfo(id, function(err, videoInfo) {
                        if (err) throw new Error(err);
                        if(videoInfo.duration > 1800) return message.channel.send(`**${message.author.username}, :x: Cannot play a video that's longer than 30 minutes**`).then(message.react(nope));
                        else message.react(correct)
                        add_to_queue(id, message);
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
                })
            })
            } else {
                isPlaying = true;
                message.channel.send(`${yt} **Searching :mag_right: \`\`${args}\`\` **`).then(() => {
                getID(args, function(id) {
                    fetchVideoInfo(id, function(err, videoInfo) {
                        if (err) throw new Error(err);
                        if(videoInfo.duration > 1800) return message.channel.send(`**${message.author.username}, :x: Cannot play a video that's longer than 30 minutes**`).then(message.react(nope))
                        else message.react(correct)
                        playMusic(id, message);
                        guilds[message.guild.id].queue.push(id);
                        guilds[message.guild.id].queueNames.push(videoInfo.title);
                        message.channel.send(`**Playing :notes: \`\`${videoInfo.title}\`\` - Now!**`);
                    });
                })})
            }
        } else {
            message.reply(novc);
        }

    } else if (mess.startsWith(prefix + "skip")) {
        if(!message.member.voiceChannel) return message.reply(novc)
        if(message.member.hasPermission('MANAGE_CHANNELS')) {
        if (guilds[message.guild.id].queueNames[0]) {
        skip_song(message);
        message.channel.send("**:fast_forward: Skipped**");
        } else return message.channel.send(`**:x: Nothing playing in this server**`);
        }
        else
        if (guilds[message.guild.id].skippers.indexOf(message.author.id) === -1) {
            guilds[message.guild.id].skippers.push(message.author.id);
            guilds[message.guild.id].skipReq++;
            if (guilds[message.guild.id].skipReq >= Math.ceil((guilds[message.guild.id].voiceChannel.members.size - 1) / 2)) {
                if (guilds[message.guild.id].queueNames[0]) {
                skip_song(message);
                message.channel.send("**:fast_forward: Skipped**");
                } else return message.channel.send(`**:x: Nothing playing in this server**`);
            } else {
                message.channel.send(`**:point_up::skin-tone-1: ${message.author.username} has vote to skip current song! **` + Math.ceil((guilds[message.guild.id].voiceChannel.members.size - 1) / 2) - guilds[message.guild.id].skipReq) + "**  more votes to skip! **";
            }
        } else {
            message.reply("<:no:439399928960253964> you already voted to skip!");
        }

    } else if (mess.startsWith(prefix + "queue")) {
        if(guilds[message.guild.id].queueNames.length < 1) return message.channel.send(`**:x: Nothing playing in this server**`);
        return message.channel.send(`
            **Now playing:** ${guilds[message.guild.id].queueNames[0]}\n
        `).then(() => {
            if(guilds[message.guild.id].queueNames.length > 1) {
            message.channel.send(`${guilds[message.guild.id].queueNames.slice(1).map(song => `**-** ${song}`).join('\n')}`)
            } else return;
        })
    }

if(mess.startsWith(prefix+"stop")) {
    if (!message.member.voiceChannel) return message.reply(novc);
    if(guilds[message.guild.id].isPlaying) guilds[message.guild.id].dispatcher.end();
    if (guilds[message.guild.id].voiceChannel)
    { 
    await clear()
    message.guild.voiceConnection.disconnect();
    message.channel.send(`**:mailbox_with_no_mail: Successfully disconnected!**`)
    }
}

else if (message.content.startsWith(prefix + 'vol')) {
    if (!message.member.voiceChannel) return message.reply(novc);
    if (guilds[message.guild.id].isPlaying) return message.channel.send("**:x: Nothing playing in this server**")
    if(!args) return message.channel.send(`**:loud_sound: Current Volume:** ${guilds[message.guild.id].dispatcher.volume*50}`)
    if (args > 150) return message.reply('**:headphones: For some health reasons the max vol you can use is ``150``, kthx**');
    if (args < 1) return message.reply("**:headphones: you can set volume from ``1`` to ``150``**");
    guilds[message.guild.id].dispatcher.setVolume(1 * args / 50);   
    message.channel.send(`**:loud_sound: Volume:** ${guilds[message.guild.id].dispatcher.volume*50}`);
}

else if (mess.startsWith(prefix + 'pause')) {
    if (!message.member.voiceChannel) return message.reply(novc);
    if (guilds[message.guild.id].isPlaying) return message.channel.send("**:x: Nothing playing in this server**")
    message.channel.send(':pause_button: **Paused**').then(() => {
        guilds[message.guild.id].dispatcher.pause();
    });
}

else if (mess.startsWith(prefix + 'resume')) {
    if (!message.member.voiceChannel) return message.reply(novc);
    if (guilds[message.guild.id].isPlaying) return message.channel.send("**:x: Nothing playing in this server**")
    message.channel.send(':play_pause: **Resuming**').then(() => {
        guilds[message.guild.id].dispatcher.resume();
    });
}


else if (mess.startsWith(prefix + 'join')) {
    if (!message.member.voiceChannel) return message.reply(novc);
    if(!guilds[message.guild.id].isPlaying || guilds[message.guild.id].queueNames.length <= 0) {
        message.member.voiceChannel.join().then(message.react(correct));
        message.channel.send(`**:page_facing_up: Queue moved to \`\`${message.member.voiceChannel.name}\`\`**`)
    } else {
        message.channel.send(`<:no:439399928960253964> **Music is being played in another voice channel!**`)
    }
}

else if (mess.startsWith(prefix + 'clear')) {
    if (!message.member.voiceChannel) return message.reply(novc);
   if(guilds[message.guild.id].queueNames.length > 1) {
    guilds[message.guild.id].queueNames.splice(1, guilds[message.guild.id].queueNames.length)
    guilds[message.guild.id].queue.splice(1, guilds[message.guild.id].queue.length)
    message.channel.send(`:asterisk: Cleared the queue of **${message.guild.name}**`)
   }
}


});




//
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
            } else {
                setTimeout(function() {
                    playMusic(guilds[message.guild.id].queue[0], message);
                   message.channel.send(`**Playing :notes: \`\`${guilds[message.guild.id].queueNames[0]}\`\` - Now!**`)
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