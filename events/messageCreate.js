export async function messageCreate(message) { // Renamed export
    if (message.author.bot) return;
    
    const bobaEmoji = message.guild.emojis.cache.find(e => e.name === 'orpheushavingboba');
    const frapsEmoji = message.guild.emojis.cache.find(e => e.name === 'fraps');
    const content = message.content.toLowerCase();

    if (content.includes('hack')) {
        const logoEmoji = message.guild.emojis.cache.find(e => e.name === 'logo');
        if (logoEmoji) await message.react(logoEmoji);
    }
    
    if (content.includes('boba') && bobaEmoji) {
        await message.react(bobaEmoji);
    }

    if ((content.includes('fraps') || content.includes('cino')) && frapsEmoji) {
        await message.react(frapsEmoji);
    }
}