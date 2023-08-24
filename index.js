require('dotenv').config()

const axios = require('axios')
const Discord = require('discord.js')
const client = new Discord.Client({
    partials: ['MESSAGE ']
});


const API_CHECK_INTERVAL = parseInt(process.env.API_CHECK_INTERVAL) || 3000
const REPEAT_MESSAGE_INTERVAL = parseInt(process.env.REPEAT_MESSAGE_INTERVAL) || 3000
const API_KEY = process.env.API_KEY || '41e90ced-d559-4433-b390-af424fdc76d6'

let isApiChecking = false
let discordChannel = null
let lastVaultStatus = "none"
let lastPoolStatus = "none"
let quietTime = 0

const apiCheck = async () => {

	if (!discordChannel || !isApiChecking) {
		return
	}

	// check vault
	try {
		const repHealth = await axios.get(`http://api.harvest.finance/health?key=${API_KEY}`)
		let bSendMessage = false
		quietTime += API_CHECK_INTERVAL
		if (repHealth.data.vaults.status != lastVaultStatus) {
			quietTime = 0
			lastVaultStatus = repHealth.data.vaults.status
			bSendMessage = true
		}

		if (repHealth.data.pools.status != lastPoolStatus) {
			quietTime = 0
			lastPoolStatus = repHealth.data.pools.status
			bSendMessage = true
		}

		if (quietTime > REPEAT_MESSAGE_INTERVAL) {
			quietTime = 0
			bSendMessage = true
		}

		if (bSendMessage) {
			console.log(quietTime)
			const embed = new Discord.MessageEmbed()
				.setTitle('API alerts')
				.setColor(repHealth.data.vaults.status == 'OK' && repHealth.data.pools.status == 'OK' ? '#5AA27C' : '#D0342C')
				.addField('Vaults api', `Status: ${repHealth.data.vaults.status}, Last updated: ${repHealth.data.vaults.lastUpdated}`)
				.addField('Pools api', `Status: ${repHealth.data.pools.status}, Last updated: ${repHealth.data.pools.lastUpdated}`)
			discordChannel.send(embed)
		}

	} catch (e) {

		console.log(e)

		const embed = new Discord.MessageEmbed()
			.setTitle('API alerts')
			.setColor('#D0342C')
			.setDescription("There was an error while checking the api health")
		discordChannel.send(embed)
	}
	
	if (isApiChecking) {
		setTimeout(apiCheck, API_CHECK_INTERVAL);
	}
}

const startApiCheck = (channel) => {

	discordChannel = channel
	isApiChecking = true
	apiCheck()
}

const stopApiCheck = () => {
	
	isApiChecking = false
}


client.on("ready", () => {
	console.log("Harvest Api check bot is ready")
	const channel = client.channels.cache.get(process.env.CHANNEL_ID)
    if (channel) {
        startApiCheck(channel)
    } else {
        console.log("Channel not found")
    }
})

client.on("message", msg => {
	try {
		if (msg.content === "/api-check-test") {

			msg.reply("Harvest api check bot is active now!");
		}
		else if (msg.content == "/api-check-start") {
			startApiCheck(msg.channel)
			msg.channel.send('Api check started!')
		}
		else if (msg.content == "/api-check-stop") { 
			stopApiCheck()
			msg.channel.send('Api check stopped!')
		}
		else if (msg.content == "/help") { 
			msg.channel.send('/api-check-start, /api-check-stop')
		}
	} catch (exception) { console.error(exception) }
})

client.login(process.env.BOT_TOKEN)
