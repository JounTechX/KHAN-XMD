const { cmd } = require("../command");

cmd({
  'pattern': 'vv',
  'alias': ['vo', "viewonce"],
  'react': '✨',
  'desc': "Read ViewOnce messages",
  'category': "download",
  'filename': __filename
}, async (bot, message, context, {
  from,
  quoted,
  senderNumber,
  reply
}) => {
  try {
    // Get the bot owner's number dynamically from bot.user.id
    const botOwner = bot.user.id.split(":")[0]; // Extract the bot owner's number
    if (senderNumber !== botOwner) {
      return reply("> *Only Owner and JawadTechX Can Use This Command 🗿*");
    }

    const viewOnceMessage = message.msg.contextInfo?.["quotedMessage"]?.['viewOnceMessageV2'];

    if (viewOnceMessage) {
      // Process ViewOnce image
      if (viewOnceMessage.message.imageMessage) {
        console.log("Quoting a ViewOnce image");
        let caption = viewOnceMessage.message.imageMessage.caption;
        let imagePath = await bot.downloadAndSaveMediaMessage(viewOnceMessage.message.imageMessage);
        return bot.sendMessage(message.chat, {
          image: { url: imagePath },
          caption: caption
        });
      }

      // Process ViewOnce video
      if (viewOnceMessage.message.videoMessage) {
        console.log("Quoting a ViewOnce video");
        let caption = viewOnceMessage.message.videoMessage.caption;
        let videoPath = await bot.downloadAndSaveMediaMessage(viewOnceMessage.message.videoMessage);
        return bot.sendMessage(message.chat, {
          video: { url: videoPath },
          caption: caption
        });
      }
    }
  } catch (error) {
    console.log("Error processing ViewOnce message:", error);
    reply("An error occurred while processing the ViewOnce message.");
  }

  // Handle cases where there is no quoted ViewOnce message
  if (!quoted) {
    return reply("Please reply to a ViewOnce message");
  }

  if (quoted.mtype === "viewOnceMessage") {
    console.log("Processing a ViewOnce message");

    // Handle ViewOnce image
    if (quoted.message.imageMessage) {
      let caption = quoted.message.imageMessage.caption;
      let imagePath = await bot.downloadAndSaveMediaMessage(quoted.message.imageMessage);
      return bot.sendMessage(message.chat, {
        image: { url: imagePath },
        caption: caption
      });
    }

    // Handle ViewOnce video
    if (quoted.message.videoMessage) {
      let caption = quoted.message.videoMessage.caption;
      let videoPath = await bot.downloadAndSaveMediaMessage(quoted.message.videoMessage);
      return bot.sendMessage(message.chat, {
        video: { url: videoPath },
        caption: caption
      });
    }
  } else {
    return reply("This is not a ViewOnce message");
  }
});


