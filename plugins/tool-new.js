const { sleep } = require('../lib/functions');
const {cmd , commands} = require('../command')

const mutedUsers = {}; // Store muted users with unmute timestamp
const mutedMessages = {}; // Store messages that should be deleted after mute duration

cmd({
    pattern: "mute",
    desc: "Mute a user for a specific duration and delete messages.",
    category: "group",
    filename: __filename,
}, 
async (conn, mek, m, { from, isGroup, senderNumber, reply }) => {
    try {
        if (!isGroup) return reply("This command can only be used in groups.");

        // Extract the mentioned user
        const mentionedUser = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        const duration = 5 * 60 * 1000; // Default mute duration: 5 minutes (can be adjusted)

        if (!mentionedUser) return reply("Please mention a user to mute.");

        // Store the muted user with the time they will be unmuted
        const muteEndTime = Date.now() + duration;
        
        // Store muted user (you can use a database, file, or memory object here)
        mutedUsers[mentionedUser] = muteEndTime;

        // Notify the group about the mute
        reply(`🔇 @${mentionedUser.split('@')[0]} has been muted for 5 minutes.`, { mentions: [mentionedUser] });

        // Automatically unmute the user after the specified duration
        setTimeout(() => {
            delete mutedUsers[mentionedUser]; // Remove from muted list
            conn.sendMessage(from, {
                text: `🔊 @${mentionedUser.split('@')[0]} is no longer muted.`,
                mentions: [mentionedUser]
            });
        }, duration);

        // Delete any new message within the mute window (5 minutes)
        const deleteMessages = () => {
            setTimeout(() => {
                // Filter out messages by muted users in the time window
                for (let user in mutedMessages) {
                    if (mutedMessages[user] && mutedMessages[user].timestamp > Date.now() - duration) {
                        conn.deleteMessage(from, mutedMessages[user].key);
                    }
                }
            }, 1000);
        };

        // Call function to delete messages after mute duration
        deleteMessages();

    } catch (e) {
        console.error("Error in .mute command:", e);
        reply("❌ An error occurred while muting the user.");
    }
});


// Handle Message Deletion within Mute Duration
conn.on("message-new", async (m) => {
    const sender = m.sender;
    const groupId = m.chat;
    
    // If the user is muted, prevent their message from being processed
    if (mutedUsers[sender] && mutedUsers[sender] > Date.now()) {
        // Store the message for deletion
        mutedMessages[sender] = { key: m.key, timestamp: Date.now() };

        // Delete the message automatically
        await conn.deleteMessage(groupId, m.key);
    }
});

cmd({
    pattern: "uinfo",
    alias: ["whois", "user"],
    desc: "Get detailed information about a user.",
    category: "group",
    filename: __filename,
},
async (conn, mek, m, { from, isGroup, text, reply }) => {
    try {
        if (!isGroup) {
            return reply("This command can only be used in groups.");
        }

        let user = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || m.sender;
        let groupMetadata = await conn.groupMetadata(from);

        // Extract user join date and added by
        let userJoined = groupMetadata.participants.find(p => p.jid === user);
        let joinedDate = new Date(userJoined?.joined || 0);
        let addedBy = userJoined?.addedBy || "Unknown";

        // Get the user's contact information
        let userInfo = await conn.getContact(user);

        // Fetch about status
        let about = userInfo.about || "No status available";

        // Check if the user has a business account
        let isBusiness = userInfo.business ? "Yes" : "No";

        // Get user's last seen (if available in your setup) - without library
        let lastSeen = await conn.getLastSeen(user); // This method may work depending on your bot's capabilities
        lastSeen = lastSeen ? new Date(lastSeen).toLocaleString() : "Not available";

        // Fetch the user's profile picture URL
        let profilePicUrl = await conn.profilePictureUrl(user, 'image').catch(() => 'https://i.ibb.co/vxKz8tX/temp-image.jpg');  // Default image if no profile picture

        // Construct user information
        let userInformation = `
*User Information:*

- Name: *${userInfo.pushname || 'No name set'}*
- Phone Number: *${userInfo.id.split('@')[0]}*
- About: *${about}*
- Business Account: *${isBusiness}*
- Join Date: *${joinedDate.toLocaleString()}*
- Added By: *${addedBy.split('@')[0]}*
- Last Seen: *${lastSeen}*

*Profile Picture:*
${profilePicUrl}
`;

        // Send the user information message with profile picture
        await conn.sendMessage(from, {
            text: userInformation,
            caption: 'User Info',
            image: { url: profilePicUrl },
        }, { quoted: m });

    } catch (e) {
        console.error("Error in .userinfo command:", e);
        reply("❌ An error occurred while fetching the user information.");
    }
});


cmd({
    pattern: "randomcolor",
    desc: "Generate a random color with name and code.",
    category: "utility",
    filename: __filename,
}, 
async (conn, mek, m, { reply }) => {
    try {
        const colorNames = [
            "Red", "Green", "Blue", "Yellow", "Orange", "Purple", "Pink", "Brown", "Black", "White", 
            "Gray", "Cyan", "Magenta", "Violet", "Indigo", "Teal", "Lavender", "Turquoise"
        ];
        
        const randomColorHex = "#" + Math.floor(Math.random()*16777215).toString(16);
        const randomColorName = colorNames[Math.floor(Math.random() * colorNames.length)];

        reply(`🎨 *Random Color:* \nName: ${randomColorName}\nCode: ${randomColorHex}`);
    } catch (e) {
        console.error("Error in .randomcolor command:", e);
        reply("❌ An error occurred while generating the random color.");
    }
});

cmd({
    pattern: "binary",
    desc: "Convert text into binary format.",
    category: "utility",
    filename: __filename,
}, 
async (conn, mek, m, { args, reply }) => {
    try {
        if (!args.length) return reply("❌ Please provide the text to convert to binary.");

        const textToConvert = args.join(" ");
        const binaryText = textToConvert.split('').map(char => {
            return `00000000${char.charCodeAt(0).toString(2)}`.slice(-8);
        }).join(' ');

        reply(`🔑 *Binary Representation:* \n${binaryText}`);
    } catch (e) {
        console.error("Error in .binary command:", e);
        reply("❌ An error occurred while converting to binary.");
    }
});

cmd({
    pattern: "binarydecode",
    desc: "Decode binary string into text.",
    category: "utility",
    filename: __filename,
}, 
async (conn, mek, m, { args, reply }) => {
    try {
        if (!args.length) return reply("❌ Please provide the binary string to decode.");

        const binaryString = args.join(" ");
        const textDecoded = binaryString.split(' ').map(bin => {
            return String.fromCharCode(parseInt(bin, 2));
        }).join('');

        reply(`🔓 *Decoded Text:* \n${textDecoded}`);
    } catch (e) {
        console.error("Error in .binarydecode command:", e);
        reply("❌ An error occurred while decoding the binary string.");
    }
});


cmd({
    pattern: "base64",
    desc: "Encode text into Base64 format.",
    category: "utility",
    filename: __filename,
}, 
async (conn, mek, m, { args, reply }) => {
    try {
        // Ensure the user provided some text
        if (!args.length) return reply("❌ Please provide the text to encode into Base64.");

        const textToEncode = args.join(" ");
        
        // Encode the text into Base64
        const encodedText = Buffer.from(textToEncode).toString('base64');
        
        // Send the encoded Base64 text
        reply(`🔑 *Encoded Base64 Text:* \n${encodedText}`);
    } catch (e) {
        console.error("Error in .base64 command:", e);
        reply("❌ An error occurred while encoding the text into Base64.");
    }
});

cmd({
    pattern: "unbase64",
    desc: "Decode Base64 encoded text.",
    category: "utility",
    filename: __filename,
}, 
async (conn, mek, m, { args, reply }) => {
    try {
        // Ensure the user provided Base64 text
        if (!args.length) return reply("❌ Please provide the Base64 encoded text to decode.");

        const base64Text = args.join(" ");
        
        // Decode the Base64 text
        const decodedText = Buffer.from(base64Text, 'base64').toString('utf-8');
        
        // Send the decoded text
        reply(`🔓 *Decoded Text:* \n${decodedText}`);
    } catch (e) {
        console.error("Error in .unbase64 command:", e);
        reply("❌ An error occurred while decoding the Base64 text.");
    }
});

cmd({
    pattern: "urlencode",
    desc: "Encode text into URL encoding.",
    category: "utility",
    filename: __filename,
}, 
async (conn, mek, m, { args, reply }) => {
    try {
        if (!args.length) return reply("❌ Please provide the text to encode into URL encoding.");

        const textToEncode = args.join(" ");
        const encodedText = encodeURIComponent(textToEncode);

        reply(`🔑 *Encoded URL Text:* \n${encodedText}`);
    } catch (e) {
        console.error("Error in .urlencode command:", e);
        reply("❌ An error occurred while encoding the text.");
    }
});

cmd({
    pattern: "urldecode",
    desc: "Decode URL encoded text.",
    category: "utility",
    filename: __filename,
}, 
async (conn, mek, m, { args, reply }) => {
    try {
        if (!args.length) return reply("❌ Please provide the URL encoded text to decode.");

        const encodedText = args.join(" ");
        const decodedText = decodeURIComponent(encodedText);

        reply(`🔓 *Decoded Text:* \n${decodedText}`);
    } catch (e) {
        console.error("Error in .urldecode command:", e);
        reply("❌ An error occurred while decoding the URL encoded text.");
    }
});

cmd({
    pattern: "roll",
    desc: "Roll a dice (1-6).",
    category: "fun",
    filename: __filename,
}, 
async (conn, mek, m, { reply }) => {
    try {
        // Roll a dice (generate a random number between 1 and 6)
        const result = Math.floor(Math.random() * 6) + 1;
        
        // Send the result
        reply(`🎲 You rolled: *${result}*`);
    } catch (e) {
        console.error("Error in .roll command:", e);
        reply("❌ An error occurred while rolling the dice.");
    }
}); 

cmd({
    pattern: "reverse",
    desc: "Reverse the given text.",
    category: "fun",
    filename: __filename,
}, 
async (conn, mek, m, { args, reply }) => {
    try {
        // Ensure text is provided
        if (!args.length) return reply("❌ Please provide the text to reverse.");

        // Reverse the text
        const reversedText = args.join(" ").split('').reverse().join('');
        
        // Send the reversed text
        reply(`🔄 Reversed Text: *${reversedText}*`);
    } catch (e) {
        console.error("Error in .reverse command:", e);
        reply("❌ An error occurred while reversing the text.");
    }
});

cmd({
    pattern: "coinflip",
    desc: "Flip a coin and get Heads or Tails.",
    category: "fun",
    filename: __filename,
}, 
async (conn, mek, m, { reply }) => {
    try {
        // Simulate coin flip (randomly choose Heads or Tails)
        const result = Math.random() < 0.5 ? "Heads" : "Tails";
        
        // Send the result
        reply(`🪙 Coin Flip Result: *${result}*`);
    } catch (e) {
        console.error("Error in .coinflip command:", e);
        reply("❌ An error occurred while flipping the coin.");
    }
});

cmd({
    pattern: "flip",
    desc: "Flip the text you provide.",
    category: "fun",
    filename: __filename,
}, 
async (conn, mek, m, { args, reply }) => {
    try {
        // Ensure text is provided
        if (!args.length) return reply("❌ Please provide the text to flip.");

        // Flip the text
        const flippedText = args.join(" ").split('').reverse().join('');
        
        // Send the flipped text
        reply(`🔄 Flipped Text: *${flippedText}*`);
    } catch (e) {
        console.error("Error in .flip command:", e);
        reply("❌ An error occurred while flipping the text.");
    }
});

cmd({
    pattern: "pick",
    desc: "Pick between two choices.",
    category: "fun",
    filename: __filename,
}, 
async (conn, mek, m, { args, reply }) => {
    try {
        // Ensure two options are provided
        if (args.length < 2) return reply("❌ Please provide two choices to pick from. Example: `.pick Ice Cream, Pizza`");

        // Pick a random option
        const option = args.join(" ").split(',')[Math.floor(Math.random() * 2)].trim();
        
        // Send the result
        reply(`🎉 Bot picks: *${option}*`);
    } catch (e) {
        console.error("Error in .pick command:", e);
        reply("❌ An error occurred while processing your request.");
    }
});

cmd({
    pattern: "timenow",
    desc: "Check the current local time.",
    category: "utility",
    filename: __filename,
}, 
async (conn, mek, m, { reply }) => {
    try {
        const now = new Date();
        const localTime = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
        reply(`🕒 Current Local Time: ${localTime}`);
    } catch (e) {
        console.error("Error in .timenow command:", e);
        reply("❌ An error occurred. Please try again later.");
    }
});

cmd({
    pattern: "shapar",
    desc: "Send shapar ASCII art with mentions.",
    category: "fun",
    filename: __filename,
}, 
async (conn, mek, m, { from, isGroup, reply }) => {
    try {
        // Ensure the command is used in a group
        if (!isGroup) {
            return reply("This command can only be used in groups.");
        }

        // Extract the mentioned user
        const mentionedUser = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        if (!mentionedUser) {
            return reply("Please mention a user to send the ASCII art to.");
        }

        // Shapar ASCII Art
        const asciiArt = `
          _______
       .-'       '-.
      /           /|
     /           / |
    /___________/  |
    |   _______ |  |
    |  |  \\ \\  ||  |
    |  |   \\ \\ ||  |
    |  |____\\ \\||  |
    |  '._  _.'||  |
    |    .' '.  ||  |
    |   '.___.' ||  |
    |___________||  |
    '------------'  |
     \\_____________\\|
`;

        // Message to send
        const message = `😂 @${mentionedUser.split("@")[0]}!\n😂 Bruh that for you:\n\n${asciiArt}`;

        // Send the message with mentions
        await conn.sendMessage(from, {
            text: message,
            mentions: [mentionedUser],
        }, { quoted: m });

    } catch (e) {
        console.error("Error in .shapar command:", e);
        reply("An error occurred while processing the command. Please try again.");
    }
});

cmd({
    pattern: "rate",
    desc: "Rate someone out of 10.",
    category: "fun",
    filename: __filename,
}, 
async (conn, mek, m, { from, isGroup, reply }) => {
    try {
        if (!isGroup) return reply("This command can only be used in groups.");

        const mentionedUser = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        if (!mentionedUser) return reply("Please mention someone to rate.");

        const randomRating = Math.floor(Math.random() * 10) + 1;
        const message = `@${mentionedUser.split("@")[0]} is rated ${randomRating}/10.`;

        await conn.sendMessage(from, { text: message, mentions: [mentionedUser] }, { quoted: m });
    } catch (e) {
        console.error("Error in .rate command:", e);
        reply("An error occurred. Please try again.");
    }
});

cmd({
    pattern: "countx",
    desc: "Start a reverse countdown from the specified number to 1.",
    category: "owner",
    filename: __filename
},
async (conn, mek, m, { args, reply, senderNumber }) => {
    try {
        // Get the bot owner's number dynamically from conn.user.id
        const botOwner = conn.user.id.split(":")[0]; // Extract the bot owner's number
        if (senderNumber !== botOwner) {
            return reply("❎ Only the bot owner can use this command.");
        }

        // Ensure arguments are provided
        if (!args[0]) {
            return reply("✳️ Use this command like:\n *Example:* .countx 10");
        }

        const count = parseInt(args[0].trim());

        // Validate the input
        if (isNaN(count) || count <= 0 || count > 50) {
            return reply("❎ Please specify a valid number between 1 and 50.");
        }

        reply(`⏳ Starting reverse countdown from ${count}...`);

        for (let i = count; i >= 1; i--) {
            await conn.sendMessage(m.chat, { text: `${i}` }, { quoted: mek });
            await sleep(1000); // 1-second delay between messages
        }

        reply(`✅ Countdown completed.`);
    } catch (e) {
        console.error(e);
        reply("❎ An error occurred while processing your request.");
    }
});

cmd({
    pattern: "count",
    desc: "Start a countdown from 1 to the specified number.",
    category: "owner",
    filename: __filename
},
async (conn, mek, m, { args, reply, senderNumber }) => {
    try {
        // Get the bot owner's number dynamically from conn.user.id
        const botOwner = conn.user.id.split(":")[0]; // Extract the bot owner's number
        if (senderNumber !== botOwner) {
            return reply("❎ Only the bot owner can use this command.");
        }

        // Ensure arguments are provided
        if (!args[0]) {
            return reply("✳️ Use this command like:\n *Example:* .count 10");
        }

        const count = parseInt(args[0].trim());

        // Validate the input
        if (isNaN(count) || count <= 0 || count > 50) {
            return reply("❎ Please specify a valid number between 1 and 50.");
        }

        reply(`⏳ Starting countdown to ${count}...`);

        for (let i = 1; i <= count; i++) {
            await conn.sendMessage(m.chat, { text: `${i}` }, { quoted: mek });
            await sleep(1000); // 1-second delay between messages
        }

        reply(`✅ Countdown completed.`);
    } catch (e) {
        console.error(e);
        reply("❎ An error occurred while processing your request.");
    }
});


cmd({
    pattern: "calculate",
    alias: ["calc"],
    desc: "Evaluate a mathematical expression.",
    category: "utilities",
    filename: __filename
},
async (conn, mek, m, { args, reply }) => {
    try {
        // Ensure arguments are provided
        if (!args[0]) {
            return reply("✳️ Use this command like:\n *Example:* .calculate 5+3*2");
        }

        const expression = args.join(" ").trim();

        // Validate the input to prevent unsafe operations
        if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
            return reply("❎ Invalid expression. Only numbers and +, -, *, /, ( ) are allowed.");
        }

        // Evaluate the mathematical expression
        let result;
        try {
            result = eval(expression);
        } catch (e) {
            return reply("❎ Error in calculation. Please check your expression.");
        }

        // Reply with the result
        reply(`✅ Result of "${expression}" is: ${result}`);
    } catch (e) {
        console.error(e);
        reply("❎ An error occurred while processing your request.");
    }
});
