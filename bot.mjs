import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers,
  downloadContentFromMessage
} from "@whiskeysockets/baileys"

import sharp from "sharp"
import { createCanvas, loadImage } from "canvas"
import pino, { levels } from "pino"
import fs from "fs"
import express from "express"
import QRCode from "qrcode"
import path from "path"
import { fileURLToPath } from "url"
import os from "os"
import moment from "moment-timezone"
import ffmpegPath from "ffmpeg-static"
import { exec } from "child_process"
import fetch from "node-fetch"
import * as math from "mathjs"
import gtts from "node-gtts"


const __dirname = path.dirname(fileURLToPath(import.meta.url))

const AUTH_FOLDER = path.join(__dirname, "auth")

const app = express()
const logger = pino({ level : "silent"})

// Use host-provided port OR fallback to 3000
const PORT = process.env.PORT || 3000

 let qrCount = 0

app.get("/", (req, res) => {
  try {
    if (!CURRENT_QR) {
      return res.send("✅ Bot is connected and running")
    }

    res.send(`
      <h2>📱 Scan QR</h2>
      <img src="${CURRENT_QR}" />
    `)
  } catch {
    res.send("Server error")
  }
})

app.get("/ping", (req, res) => res.send("alive"))

app.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`)
})

// ===== GLOBAL CRASH PROTECTION =====
process.on("uncaughtException", console.error)
process.on("unhandledRejection", console.error)

// 🔥 Auto memory cleanup
setInterval(() => {
  global.gc?.()
}, 60000)

// ===== GLOBAL STATES =====
let CURRENT_QR = ""
let reconnecting = false

// ================= GLOBAL STORAGE =================
global.STATUS_DB = global.STATUS_DB || []
global.STATUS_HASH = new Set()
const pairCache = new Set()

// ================= RUNTIME FORMATTER =================

function formatRuntime(ms) {
  if (!ms || ms < 0) return "0s"

  const sec = Math.floor(ms / 1000) % 60
  const min = Math.floor(ms / (1000 * 60)) % 60
  const hr = Math.floor(ms / (1000 * 60 * 60))

  return `${hr}h ${min}m ${sec}s`
}

// ================= DM AUTO REPLY SYSTEM (OWNER ONLY CONTROL) =================
global.OWNER_NAME = "Boss"
global.DM_AUTO_REPLY = global.DM_AUTO_REPLY || {
  enabled: false,

words: {
  hello: ["Hello 👋", "Hi 😄", "Hey there 😊", "Yo 👋", "Hey buddy 😎"],
  hi: ["Hello 😄", "Hi friend 👋", "Hey 👋", "Hi there 😊"],
  hey: ["Hey 👋", "Hey there 😎", "Yo 😄"],
  morning: ["Good morning ☀️", "Morning 👋", "Rise and shine 🌞"],
  afternoon: ["Good afternoon ☀️", "Hope your day is going great 😄"],
  evening: ["Good evening 🌆", "Evening 👋"],
  night: ["Good night 🌙", "Sleep well 😴", "Sweet dreams ✨"],
  bot: ["I'm here 🤖", "Yes? 👀", "Bot active ⚡"],
  thanks: ["Welcome 😊", "No problem 👍", "Anytime 😄"],
  thankyou: ["You're welcome 😊", "Happy to help 💙"],
  ok: ["Alright 👍", "Okay 👌", "Sure 😄"],
  yes: ["Nice 😎", "Alright 🔥"],
  no: ["Okay 👌", "No problem 😄"],
  lol: ["😂", "Haha 😆", "Lmao 🤣"],
  bye: ["Bye 👋", "See you 😄", "Take care 💙"],
  help: ["Type .menu for commands 📋", "Need help? Use .menu 👀"],

  owner: ["👑 My owner is amazing", "👑 Respect the owner I was created by Neche AKA Boss"],
  menu: ["📋 Type .menu to explore commands"],
  ping: ["🏓 Pong!"],
  alive: ["💚 I'm active and running"],

  love: ["❤️ Love you too", "💖 Sending love"],
  miss: ["🥹 Aww, I’m here"],
  sad: ["💙 Stay strong", "🥺 Hope things get better"],
  happy: ["😄 That’s awesome!", "🎉 Nice!"],
  angry: ["😅 Calm down", "🧘 Relax a little"],

  who: ["🤖 I'm your smart bot assistant"],
  what: ["👀 Can you explain more?"],
  where: ["📍 Depends, tell me more"],
  when: ["⏳ Soon maybe 😄"],
  why: ["🤔 Good question"],

  joke: ["😂 Why did the bot cross the chat? To reply you!"],
  funny: ["🤣 You’re funny too"],
  bored: ["🎮 Try .menu for fun commands"],
  sleep: ["😴 Go get some rest"],
  food: ["🍔 I wish bots could eat"],
  hungry: ["🍕 Go grab something tasty"],
  music: ["🎵 Music makes everything better"],
  game: ["🎮 Games are fun"],
  school: ["📚 Study hard"],
  exam: ["📝 Good luck!"],
  work: ["💼 Stay productive"],

  whatsapp: ["💬 Best chat app 😎"],
  group: ["👥 Groups can be fun"],
  admin: ["👮 Respect admins"],
  sticker: ["🎭 Stickers are cool"],
  viewonce: ["👁️ I can help with that 😎"],

  good: ["😄 Nice!", "🔥 Awesome"],
  bad: ["😬 Ouch"],
  cool: ["😎 Very cool"],
  wow: ["😮 Wow indeed"],
  nice: ["💯 Nice one"],
  bro: ["😎 Bro!"],
  sis: ["😊 Sis!"],
  dude: ["😎 Yo dude"],
  guy: ["👋 Hey"],
  girl: ["😊 Hello"],

  test: ["✅ Test successful"],
  check: ["👀 Checking..."],
  status: ["📊 Status: Active"],
  update: ["⚡ Updated"],
  send: ["📩 Sending..."],
  wait: ["⏳ Please wait"],
  fast: ["⚡ Super fast"],
  slow: ["🐢 Taking it slow"],

  Nigeria: ["🇳🇬 Naija no dey carry last"],
  Lagos: ["🌆 Lagos vibes"],
  Abuja: ["🏛️ Abuja strong"],
  Africa: ["🌍 Africa to the world"],

  God: ["🙏 Stay blessed"],
  prayer: ["🙏 Amen"],
  church: ["⛪ Blessings"],
  bless: ["✨ Bless you"],

  money: ["💸 Secure the bag"],
  rich: ["🤑 Big money vibes"],
  poor: ["💙 Better days ahead"],

  phone: ["📱 Phones are life"],
  android: ["🤖 Android gang"],
  iphone: ["🍎 Premium vibes"],

  internet: ["🌐 Connected"],
  wifi: ["📶 Signal strong"],
  network: ["📡 Stay connected"],

  friend: ["😊 Friends matter"],
  family: ["🏡 Family first"],
  mom: ["❤️ Moms are special"],
  dad: ["💪 Dads provides for the family"],

  default: [
    "🤖 I'm currently unavailable right now.",
    "💬 Message received.",
    "⚡ I'll reply soon.",
    "👋 Thanks for your message.",
    "📩 Your message has been noted.",
    "😊 I’ll respond when available."
  ]
}}

// ╔══════════════════════════════════════╗
// 👋 FULL WELCOME / GOODBYE SYSTEM
// ✅ Group only
// ✅ Custom text
// ✅ On/Off
// ✅ View / Reset
// ✅ Test
// ✅ Image support
// ✅ Variables:
// {user} {group} {date} {time} {members} {owner}
// ╚══════════════════════════════════════╝

// 📂 GLOBAL DEFAULT
// global.GROUP_WELCOME = global.GROUP_WELCOME || {}

// const DEFAULT_WELCOME =
//   "👋 Welcome {user} to {group}\n👥 Members: {members}\n📅 {date}\n⏰ {time}"

// const DEFAULT_GOODBYE =
//   "🚪 Goodbye {user}\nWe’ll miss you in {group}"

// 🔄 FORMAT VARIABLES
function formatMessage(text = "", data = {}) {
  return String(text)
    .replace(/{user}/g, data.user || "User")
    .replace(/{group}/g, data.group || "Group")
    .replace(/{date}/g, data.date || "")
    .replace(/{time}/g, data.time || "")
    .replace(/{members}/g, data.members || "0")
    .replace(/{owner}/g, data.owner || "Bot Owner")
}

function generateWelcomeCard(name, groupName) {
  return new Promise((resolve, reject) => {
    try {

      const safeName = String(name || "User")
        .replace(/[^a-zA-Z0-9 ]/g, "")

      const safeGroup = String(groupName || "Group")
        .replace(/[^a-zA-Z0-9 ]/g, "")

      const output = `welcome_${Date.now()}.jpg`

      const cmd =
        `ffmpeg -y -f lavfi -i color=c=green:s=720x1280 ` +
        `-vf "drawtext=fontfile=C\\\\:/Windows/Fonts/arial.ttf:text='Welcome ${safeName}':fontcolor=Black:fontsize=60:x=(w-text_w)/2:y=400,` +
        `drawtext=fontfile=C\\\\:/Windows/Fonts/arial.ttf:text='${safeGroup}':fontcolor=white:fontsize=40:x=(w-text_w)/2:y=500" ` +
        `-frames:v 1 "${output}"`

      exec(cmd, (err) => {
        if (err) {
          console.log("FFMPEG ERROR:", err)
          return reject(err)
        }
        resolve(output)
      })

    } catch (e) {
      reject(e)
    }
  })
}

function generateVoice(text, file) {
  return new Promise((resolve, reject) => {
    try {
      const speech = new gtts("en")

      speech.save(file, text, (err) => {
        if (err) return reject(err)
        resolve(file)
      })

    } catch (e) {
      reject(e)
    }
  })
}

function generateAnimatedWelcome(name, output) {
  return new Promise((resolve, reject) => {

    const text = `Welcome ${name}`

    exec(
      `ffmpeg -y -f lavfi -i color=c=black:s=720x1280:d=5 `
      + `-vf "drawtext=text='${text}':fontcolor=white:fontsize=50:x=(w-text_w)/2:y=(h-text_h)/2" `
      + output,

      (err) => {
        if (err) return reject(err)
        resolve(output)
      }
    )
  })
}

// 🔊 GOODBYE VOICE GENERATOR
function generateGoodbyeVoice(text, file) {
  return new Promise((resolve, reject) => {
    try {

      // ✅ ALWAYS language must be "en"
      const speech = new gtts(text, "en")

      speech.save(file, (err) => {
        if (err) return reject(err)
        resolve(file)
      })

    } catch (e) {
      reject(e)
    }
  })
}

// 🎭 ANIMATED GOODBYE VIDEO GENERATOR
function generateAnimatedGoodbye(name, output) {
  return new Promise((resolve, reject) => {
    try {

      const safeName = String(name || "User")
        .replace(/'/g, "")
        .replace(/"/g, "")

      // ❌ IMPORTANT: must be GOODBYE (not welcome)
      const text = `Goodbye ${safeName}`

      exec(
        `ffmpeg -y -f lavfi -i color=c=black:s=720x1280:d=5 ` +
        `-vf "drawtext=text='${text}':fontcolor=white:fontsize=50:x=(w-text_w)/2:y=(h-text_h)/2" ` +
        `-pix_fmt yuv420p "${output}"`,

        (err) => {
          if (err) return reject(err)
          resolve(output)
        }
      )

    } catch (e) {
      reject(e)
    }
  })
}

// 🖼️ GOODBYE IMAGE CARD GENERATOR
function generateGoodbyeCard(name, groupName) {
  return new Promise((resolve, reject) => {
    try {

      const safeName = String(name || "User")
        .replace(/[^a-zA-Z0-9 ]/g, "")

      const safeGroup = String(groupName || "Group")
        .replace(/[^a-zA-Z0-9 ]/g, "")

      const output = `goodbye_${Date.now()}.jpg`

      const cmd =
        `ffmpeg -y -f lavfi -i color=c=black:s=720x1280 ` +
        `-vf "drawtext=fontfile=C\\\\:/Windows/Fonts/arial.ttf:text='Goodbye ${safeName}':fontcolor=Red:fontsize=60:x=(w-text_w)/2:y=400,` +
        `drawtext=fontfile=C\\\\:/Windows/Fonts/arial.ttf:text='${safeGroup}':fontcolor=white:fontsize=40:x=(w-text_w)/2:y=500" ` +
        `-frames:v 1 "${output}"`

      exec(cmd, (err) => {
        if (err) {
          console.log("FFMPEG ERROR:", err)
          return reject(err)
        }
        resolve(output)
      })

    } catch (e) {
      reject(e)
    }
  })
}
// ================= RANDOM PICKER =================

function pickRandom(arr = []) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ================= SMART AUTO REPLY ENGINE =================

function getSmartAutoReply(message = "") {
  const text = String(message || "").toLowerCase()

  if (!text) {
    return pickRandom(global.DM_AUTO_REPLY.defaultReplies)
  }

  for (const key of Object.keys(global.DM_AUTO_REPLY.words)) {
    if (typeof key === "string" && text.includes(key)) {
      const arr = global.DM_AUTO_REPLY.words[key]
      return pickRandom(arr)
    }
  }

  return pickRandom(global.DM_AUTO_REPLY.defaultReplies)
}

// ================= CONFIG =================
const PREFIX = "!"
const BOT_STATS = {
  startTime: Date.now(),
  messages: 0,
  commands: 0
}

function getUserRole({
  isOwner,
  isAdmin,
  isBot,
  isGroup
}) {

  // 🤖 Bot
  if (isBot) {
    return "🤖 Bot"
  }

  // 👑 Owner
  if (isOwner) {
    return "👑 Owner"
  }

  // 🛡️ Group Admin
  if (isGroup && isAdmin) {
    return "🛡️ Group Admin"
  }

  // 👤 Group Member
  if (isGroup) {
    return "👤 Group Member"
  }

  // 💬 Private User
  return "💬 Private User"
}

const GROUP_SCHEDULES = {}
let warns = {} 
// ================= WARN DATABASE =================
const WARN_DB = global.WARN_DB || (global.WARN_DB = {})

const WARN_LIMIT = 3

const saveWarnDB = () => {
  try {
    fs.writeFileSync(
      "./warn_db.json",
      JSON.stringify(WARN_DB, null, 2)
    )
  } catch (e) {
    console.log("WARN SAVE ERROR:", e)
  }
}

const loadWarnDB = () => {
  try {
    if (fs.existsSync("./warn_db.json")) {
      Object.assign(
        WARN_DB,
        JSON.parse(fs.readFileSync("./warn_db.json"))
      )
    }
  } catch (e) {
    console.log("WARN LOAD ERROR:", e)
  }
}

loadWarnDB()

const addWarn = async (sock, jid, user, reason) => {
  if (!WARN_DB[jid]) WARN_DB[jid] = {}
  if (!WARN_DB[jid][user]) WARN_DB[jid][user] = []

  WARN_DB[jid][user].push({
    reason,
    time: Date.now()
  })

  const count = WARN_DB[jid][user].length

  if (count >= WARN_LIMIT) {
    try {
      await sock.groupParticipantsUpdate(jid, [user], "remove")

      delete WARN_DB[jid][user]

      await sock.sendMessage(jid, {
        text: `🚫 @${user.split("@")[0]} removed (${reason})`,
        mentions: [user]
      })
    } catch (e) {
      console.log("WARN REMOVE ERROR:", e)
    }
  } else {
    await sock.sendMessage(jid, {
      text: `⚠️ @${user.split("@")[0]} warning ${count}/${WARN_LIMIT}\nReason: ${reason}`,
      mentions: [user]
    })
  }

  saveWarnDB()
}

// ==== STICKER META ====

const STICKER_META = {
  packname: "BOSS' BOT 🤖",
  author: "Sticker Engine v2"
}

const createSticker = async (buffer) => {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error("Invalid buffer")
  }

  try {
    return await sharp(buffer)
      .resize(512, 512, { fit: "contain" })
      .webp({ quality: 80 })
      .toBuffer()
  } catch (e) {
    console.log("Sticker error:", e)
    throw new Error("Unsupported image format")
  }
}

  // =====MENU COMMANDS ====

const PREMIUM_MENU_SECTIONS = {
  "🛡️ PROTECTION": [
    "antilink",
    "antibadword",
    "antidelete",
    "antistatus",
    "antistatusmention"
  ],

  "👥 ADMIN": [
    "kick",
    "add",
    "invite",
    "promote",
    "demote",
    "tagall",
    "hidetag",
    "tagonline",
      "admins",
  "adminsonline",
  "adminstats"
  ],

  "⚙️ GROUP": [
    "setname",
    "setdesc",
    "groupinfo",
    "grouplink",
    "revoke",
    "lock",
    "unlock",
    "mute",
    "unmute",
    "mutelist"
  ],

  "🖇️ JOIN REQUESTS":[
    "approve",
    "approveall",
    "reject",
    "rejectall",
    "requests"
  ],

  "🕒 SCHEDULE": [
    "setopen",
    "setclose",
    "schedule",
    "scheduleon",
    "scheduleoff"
  ],

  "🎨 MEDIA": [
    "getstatus",
    "vv",
  "viewonce", 
    "pp",
    "sticker",
    "stickergif",
    "memesticker",
    "captionsticker",
    "stickerpack",
     "statuslist",
  "autostatus",
  "statusfilter",
  "clearstatus",
  ],

  "👑 OWNER": [
    "addowner",
    "delowner",
    "owners",
    "restart",
    "shutdown",
    "broadcast",
    "delete",
    "del",
    "ban",
    "unban",
    "banned",
  ],

  "💬 AUTO REPLY":[
    "autoreplyon",
    "autoreplyoff",
    "addreply",
    "delreply",
    "listreply",
  ],

  "⚠️ WARN": [
    "warn",
    "warnlist",
    "warninfo",
    "unwarn",
    "resetwarns"
  ],

  "📦 STICKER PACK": [
    "packcreate",
    "packadd",
    "packview",
    "packlist",
    "packdelete",
    "packsend"
  ],

  "ℹ️ INFO": [
    "runtime",
    "help",
    "mode",
    "alive",
    "whoami",
    "stats",
    "ping",
    "test",
    "nettest",
  ],

// 👋 WELCOME / GOODBYE
"👋 WELCOME & GOODBYE": [
  "welcome",
  "goodbye",
  "setwelcome",
  "setgoodbye",
  "viewwelcome",
  "viewgoodbye",
  "resetwelcome",
  "resetgoodbye",
  "testwelcome",
  "testgoodbye",
  "welcomestyle",
  "goodbyestyle",
  "welcomecolor",
  "goodbyecolor",
  "welcomedelay",
  "ruleswelcome",
  "autorole",
  "autopromote",
  "autodemote",
  "autoclean",
  "autogift"
],

// 🧮 CALCULATOR
"🧮 MATH ENGINE": [
  "math",
  "calc",
  "calculate"
],

    "🌐 TRANSLATE / DECTECT LANGUAGES":[
    "translate",
    "detect",
    "dictionary",
  "dict"
  ],

  // ⚙️ SETTINGS
"⚙️ SETTINGS": [
  "settings",
  "dashboard"
],

// 🎮 FUN & GAMES
"🎮 FUN & GAMES":[
  "truth",
  "dare",
  "joke",
  "quote",
  "ship",
  "pair",
  "fact",
  "riddle",
  "trivia",
  "guess",
  "roll",
  "flip",
],

}

const COMMAND_DESCRIPTIONS = {
  // 🛡️ PROTECTION
  antilink: "🚫 𝘽𝙡𝙤𝙘𝙠 𝙒𝙝𝙖𝙩𝙨𝘼𝙥𝙥 & 𝙚𝙭𝙩𝙚𝙧𝙣𝙖𝙡 𝙡𝙞𝙣𝙠𝙨",
  antibadword: "🧼 𝘼𝙪𝙩𝙤-𝙧𝙚𝙢𝙤𝙫𝙚 𝙤𝙛𝙛𝙚𝙣𝙨𝙞𝙫𝙚 𝙬𝙤𝙧𝙙𝙨",
  antidelete: "🧠 𝙍𝙚𝙘𝙤𝙫𝙚𝙧 𝙙𝙚𝙡𝙚𝙩𝙚𝙙 𝙢𝙚𝙨𝙨𝙖𝙜𝙚𝙨",
  antistatus: "👁️ 𝘽𝙡𝙤𝙘𝙠 𝙨𝙩𝙖𝙩𝙪𝙨 𝙫𝙞𝙚𝙬𝙞𝙣𝙜",
  antistatusmention: "📢 𝘽𝙡𝙤𝙘𝙠 𝙨𝙩𝙖𝙩𝙪𝙨 𝙢𝙚𝙣𝙩𝙞𝙤𝙣𝙨",

// 👥 ADMIN
  kick: "👢 𝙍𝙚𝙢𝙤𝙫𝙚 𝙖 𝙪𝙨𝙚𝙧 𝙛𝙧𝙤𝙢 𝙜𝙧𝙤𝙪𝙥",
  add: "➕ 𝘼𝙙𝙙 𝙪𝙨𝙚𝙧 𝙩𝙤 𝙜𝙧𝙤𝙪𝙥",
  invite: "🔗 𝙎𝙚𝙣𝙙 𝙜𝙧𝙤𝙪𝙥 𝙞𝙣𝙫𝙞𝙩𝙚 𝙡𝙞𝙣𝙠",
  promote: "⬆️ 𝙋𝙧𝙤𝙢𝙤𝙩𝙚 𝙪𝙨𝙚𝙧 𝙩𝙤 𝙖𝙙𝙢𝙞𝙣",
  demote: "⬇️ 𝙍𝙚𝙢𝙤𝙫𝙚 𝙖𝙙𝙢𝙞𝙣 𝙥𝙧𝙞𝙫𝙞𝙡𝙚𝙜𝙚𝙨",
  tagall: "📣 𝙈𝙚𝙣𝙩𝙞𝙤𝙣 𝙖𝙡𝙡 𝙢𝙚𝙢𝙗𝙚𝙧𝙨",
  hidetag: "👻 𝙃𝙞𝙙𝙙𝙚𝙣 𝙜𝙧𝙤𝙪𝙥 𝙢𝙚𝙣𝙩𝙞𝙤𝙣",
  tagonline: "🟢 𝙏𝙖𝙜 𝙖𝙘𝙩𝙞𝙫𝙚 𝙢𝙚𝙢𝙗𝙚𝙧𝙨",
  admins: "👑 𝙑𝙞𝙚𝙬 𝙖𝙡𝙡 𝙜𝙧𝙤𝙪𝙥 𝙖𝙙𝙢𝙞𝙣𝙨",
adminsonline: "🟢 𝙑𝙞𝙚𝙬 𝙤𝙣𝙡𝙞𝙣𝙚 / 𝙖𝙘𝙩𝙞𝙫𝙚 𝙖𝙙𝙢𝙞𝙣𝙨",
adminstats: "📊 𝙑𝙞𝙚𝙬 𝙖𝙙𝙢𝙞𝙣 𝙖𝙣𝙖𝙡𝙮𝙩𝙞𝙘𝙨",

  // ⚙️ GROUP
  setname: "✏️ 𝘾𝙝𝙖𝙣𝙜𝙚 𝙜𝙧𝙤𝙪𝙥 𝙣𝙖𝙢𝙚",
  setdesc: "📝 𝙐𝙥𝙙𝙖𝙩𝙚 𝙜𝙧𝙤𝙪𝙥 𝙙𝙚𝙨𝙘",
  groupinfo: "📊 𝙑𝙞𝙚𝙬 𝙜𝙧𝙤𝙪𝙥 𝙖𝙣𝙖𝙡𝙮𝙩𝙞𝙘𝙨",
  grouplink: "🔗 𝙂𝙚𝙩 𝙞𝙣𝙫𝙞𝙩𝙚 𝙡𝙞𝙣𝙠",
  revoke: "♻️ 𝙍𝙚𝙨𝙚𝙩 𝙞𝙣𝙫𝙞𝙩𝙚 𝙡𝙞𝙣𝙠",
  lock: "🔒 𝙇𝙤𝙘𝙠 𝙜𝙧𝙤𝙪𝙥",
  unlock: "🔓 𝙐𝙣𝙡𝙤𝙘𝙠 𝙜𝙧𝙤𝙪𝙥",
  mute: "🔇 𝙈𝙪𝙩𝙚 𝙖 𝙪𝙨𝙚𝙧",
  unmute: "🔊 𝙐𝙣𝙢𝙪𝙩𝙚 𝙖 𝙪𝙨𝙚𝙧",
  mutelist: "📋 𝙑𝙞𝙚𝙬 𝙢𝙪𝙩𝙚𝙙 𝙪𝙨𝙚𝙧𝙨",

  //🖇️  JOIN REQUESTS
  approve: "✅ 𝘼𝙥𝙥𝙧𝙤𝙫𝙚 𝙟𝙤𝙞𝙣 𝙧𝙚𝙦𝙪𝙚𝙨𝙩",
  approveall: "🎉 𝘼𝙥𝙥𝙧𝙤𝙫𝙚 𝙖𝙡𝙡 𝙟𝙤𝙞𝙣 𝙧𝙚𝙦𝙪𝙚𝙨𝙩𝙨",
  reject: "🚫 𝙍𝙚𝙟𝙚𝙘𝙩 𝙟𝙤𝙞𝙣 𝙧𝙚𝙦𝙪𝙚𝙨𝙩",
  rejectall: "⛔ 𝙍𝙚𝙟𝙚𝙘𝙩 𝙖𝙡𝙡 𝙟𝙤𝙞𝙣 𝙧𝙚𝙦𝙪𝙚𝙨𝙩𝙨",
  requests: "📨 𝙑𝙞𝙚𝙬 𝙥𝙚𝙣𝙙𝙞𝙣𝙜 𝙧𝙚𝙦𝙪𝙚𝙨𝙩𝙨",

  // 🕒 SCHEDULE
  setopen: "🌅 𝙎𝙚𝙩 𝙙𝙖𝙞𝙡𝙮 𝙤𝙥𝙚𝙣 𝙩𝙞𝙢𝙚",
  setclose: "🌙 𝙎𝙚𝙩 𝙙𝙖𝙞𝙡𝙮 𝙘𝙡𝙤𝙨𝙚 𝙩𝙞𝙢𝙚",
  schedule: "📅 𝙑𝙞𝙚𝙬 𝙜𝙧𝙤𝙪𝙥 𝙨𝙘𝙝𝙚𝙙𝙪𝙡𝙚",
  scheduleon: "✅ 𝙀𝙣𝙖𝙗𝙡𝙚 𝙨𝙘𝙝𝙚𝙙𝙪𝙡𝙚",
  scheduleoff: "⛔ 𝘿𝙞𝙨𝙖𝙗𝙡𝙚 𝙨𝙘𝙝𝙚𝙙𝙪𝙡𝙚",

  // 🎨 MEDIA
  getstatus: "📥 𝙀𝙭𝙩𝙧𝙖𝙘𝙩 𝙒𝙝𝙖𝙩𝙨𝘼𝙥𝙥 𝙨𝙩𝙖𝙩𝙪𝙨",
  vv: "🔏 𝙋𝙧𝙞𝙫𝙖𝙩𝙚 𝙑𝙞𝙚𝙬-𝙊𝙣𝙘𝙚 𝙍𝙚𝙘𝙤𝙫𝙚𝙧 (𝙎𝙚𝙣𝙙 𝙩𝙤 𝙊𝙬𝙣𝙚𝙧)",
viewonce: "👁️ 𝘾𝙤𝙣𝙫𝙚𝙧𝙩 𝙑𝙞𝙚𝙬-𝙊𝙣𝙘𝙚 → 𝙉𝙤𝙧𝙢𝙖𝙡 𝙈𝙚𝙙𝙞𝙖 (𝙋𝙪𝙗𝙡𝙞𝙘)",
  pp: "🖼️ 𝙃𝘿 𝙥𝙧𝙤𝙛𝙞𝙡𝙚 𝙥𝙞𝙘",
  sticker: "🎭 𝘾𝙤𝙣𝙫𝙚𝙧𝙩 𝙞𝙢𝙖𝙜𝙚 𝙩𝙤 𝙨𝙩𝙞𝙘𝙠𝙚𝙧",
  take: "✍️ 𝘾𝙪𝙨𝙩𝙤𝙢 𝙨𝙩𝙞𝙘𝙠𝙚𝙧",
  stickergif: "🎬 𝙑𝙞𝙙𝙚𝙤 → 𝙖𝙣𝙞𝙢𝙖𝙩𝙚𝙙 𝙨𝙩𝙞𝙘𝙠𝙚𝙧",
  memesticker: "😂 𝙏𝙚𝙭𝙩 → 𝙢𝙚𝙢𝙚 𝙨𝙩𝙞𝙘𝙠𝙚𝙧",
  captionsticker: "✍️ 𝘾𝙖𝙥𝙩𝙞𝙤𝙣 → 𝙨𝙩𝙞𝙘𝙠𝙚𝙧",
  stickerpack: "📦 𝘾𝙧𝙚𝙖𝙩𝙚 𝙨𝙩𝙞𝙘𝙠𝙚𝙧 𝙥𝙖𝙘𝙠",
  statussave: "📥 𝘼𝙪𝙩𝙤 𝙎𝙩𝙖𝙩𝙪𝙨 𝙎𝙖𝙫𝙚𝙧 (𝙄𝙢𝙖𝙜𝙚 / 𝙑𝙞𝙙𝙚𝙤 / 𝘼𝙪𝙙𝙞𝙤)",
statuslist: "📚 𝙑𝙞𝙚𝙬 𝙎𝙖𝙫𝙚𝙙 𝙎𝙩𝙖𝙩𝙪𝙨𝙚𝙨",
statusfilter: "👥 𝘾𝙤𝙣𝙩𝙖𝙘𝙩-𝘽𝙖𝙨𝙚𝙙 𝙁𝙞𝙡𝙩𝙚𝙧 (𝙋𝙧𝙞𝙫𝙖𝙩𝙚 𝙎𝙩𝙖𝙩𝙪𝙨 𝙎𝙖𝙫𝙚𝙧)",
clearstatus: "🧹 𝘾𝙡𝙚𝙖𝙧 𝙎𝙖𝙫𝙚𝙙 𝙎𝙩𝙖𝙩𝙪𝙨𝙚𝙨",
autostatus: "⚙️ 𝙏𝙤𝙜𝙜𝙡𝙚 𝘼𝙪𝙩𝙤 𝙎𝙩𝙖𝙩𝙪𝙨 𝙎𝙖𝙫𝙚 (𝙊𝙉/𝙊𝙁𝙁)",

  // 👑 OWNER
  addowner: "👑 𝘼𝙙𝙙 𝙗𝙤𝙩 𝙤𝙬𝙣𝙚𝙧",
  delowner: "🗑️ 𝙍𝙚𝙢𝙤𝙫𝙚 𝙗𝙤𝙩 𝙤𝙬𝙣𝙚𝙧",
  owners: "📋 𝙑𝙞𝙚𝙬 𝙤𝙬𝙣𝙚𝙧𝙨",
  restart: "🔄 𝙍𝙚𝙨𝙩𝙖𝙧𝙩 𝙗𝙤𝙩",
  shutdown: "⛔ 𝙎𝙝𝙪𝙩𝙙𝙤𝙬𝙣 𝙗𝙤𝙩",
  broadcast: "📢 𝘽𝙧𝙤𝙖𝙙𝙘𝙖𝙨𝙩 𝙩𝙤 𝙖𝙡𝙡 𝙘𝙝𝙖𝙩𝙨",
  delete:"🧼 𝘽𝙤𝙩 𝙊𝙬𝙣𝙚𝙧 𝙁𝙤𝙧𝙘𝙚 𝘿𝙚𝙡𝙚𝙩𝙚",
  del:"🚮 𝙊𝙬𝙣𝙚𝙧 𝘿𝙚𝙡𝙚𝙩𝙚",
 ban: "🚷 𝘽𝙡𝙤𝙘𝙠 & 𝘽𝙖𝙣 𝘾𝙤𝙣𝙩𝙖𝙘𝙩 (𝘿𝙈)",
unban: "✅ 𝙐𝙣𝙗𝙡𝙤𝙘𝙠 & 𝙐𝙣𝙗𝙖𝙣 𝘾𝙤𝙣𝙩𝙖𝙘𝙩",
banned: "📋 𝙑𝙞𝙚𝙬 𝘽𝙖𝙣𝙣𝙚𝙙 𝙐𝙨𝙚𝙧𝙨",


  // 💬 AUTO REPLY

 autoreplyon : "💬 𝙀𝙣𝙖𝙗𝙡𝙚 𝘿𝙈 𝘼𝙪𝙩𝙤 𝙍𝙚𝙥𝙡𝙮",
 autoreplyoff:  "🔕 𝘿𝙞𝙨𝙖𝙗𝙡𝙚 𝘿𝙈 𝘼𝙪𝙩𝙤 𝙍𝙚𝙥𝙡𝙮",
addreply: "➕ 𝘼𝙙𝙙 𝙆𝙚𝙮𝙬𝙤𝙧𝙙 𝙍𝙚𝙥𝙡𝙮",
delreply: "🗑️ 𝙍𝙚𝙢𝙤𝙫𝙚 𝙆𝙚𝙮𝙬𝙤𝙧𝙙 𝙍𝙚𝙥𝙡𝙮",
 listreply: "📋 𝙑𝙞𝙚𝙬 𝘼𝙡𝙡 𝙍𝙚𝙥𝙡𝙞𝙚𝙨",

  // ⚠️ WARN
  warn: "⚠️ 𝙒𝙖𝙧𝙣 𝙖 𝙪𝙨𝙚𝙧",
  warnlist: "📋 𝙑𝙞𝙚𝙬 𝙬𝙖𝙧𝙣 𝙡𝙞𝙨𝙩",
  warninfo: "👤 𝘾𝙝𝙚𝙘𝙠 𝙬𝙖𝙧𝙣 𝙝𝙞𝙨𝙩𝙤𝙧𝙮",
  unwarn: "🧹 𝘾𝙡𝙚𝙖𝙧 𝙬𝙖𝙧𝙣",
  resetwarns: "♻️ 𝙍𝙚𝙨𝙚𝙩 𝙖𝙡𝙡 𝙬𝙖𝙧𝙣𝙨",

  // 📦 STICKER PACK
  packcreate: "📦 𝘾𝙧𝙚𝙖𝙩𝙚 𝙣𝙚𝙬 𝙥𝙖𝙘𝙠",
  packadd: "➕ 𝘼𝙙𝙙 𝙨𝙩𝙞𝙘𝙠𝙚𝙧",
  packview: "👀 𝙑𝙞𝙚𝙬 𝙥𝙖𝙘𝙠",
  packlist: "📚 𝙑𝙞𝙚𝙬 𝙥𝙖𝙘𝙠𝙨",
  packdelete: "🗑️ 𝘿𝙚𝙡𝙚𝙩𝙚 𝙥𝙖𝙘𝙠",
  packsend: "🎲 𝙍𝙖𝙣𝙙𝙤𝙢 𝙥𝙖𝙘𝙠 𝙨𝙚𝙣𝙙",

  // ℹ️ INFO
  menu: "📜 𝘿𝙞𝙨𝙥𝙡𝙖𝙮 𝙛𝙪𝙡𝙡 𝙗𝙤𝙩 𝙢𝙚𝙣𝙪",
  help: "❓ 𝙂𝙚𝙩 𝙘𝙤𝙢𝙢𝙖𝙣𝙙 𝙜𝙪𝙞𝙙𝙚",
  mode: "⚙️ 𝙎𝙬𝙞𝙩𝙘𝙝 𝙗𝙤𝙩 𝙢𝙤𝙙𝙚",
  alive: "💚 𝘾𝙝𝙚𝙘𝙠 𝙗𝙤𝙩 𝙨𝙩𝙖𝙩𝙪𝙨",
  whoami: "🆔 𝙎𝙝𝙤𝙬 𝙮𝙤𝙪𝙧 𝙄𝘿",
  stats: "📊 𝘽𝙤𝙩 𝙪𝙨𝙖𝙜𝙚 𝙨𝙩𝙖𝙩𝙨",
  ping: "🏓 𝘾𝙝𝙚𝙘𝙠 𝙨𝙥𝙚𝙚𝙙",
  runtime: "⏱️ 𝙎𝙚𝙚 𝙗𝙤𝙩 𝙪𝙥𝙩𝙞𝙢𝙚",
  test: "🧪 𝙏𝙚𝙨𝙩 𝘽𝙤𝙩 𝙍𝙚𝙨𝙥𝙤𝙣𝙨𝙚",
nettest: "🌐 𝘾𝙝𝙚𝙘𝙠 𝙄𝙣𝙩𝙚𝙧𝙣𝙚𝙩 𝘾𝙤𝙣𝙣𝙚𝙘𝙩𝙞𝙤𝙣",

// 👋 WELCOME
welcome: "👋 𝙏𝙤𝙜𝙜𝙡𝙚 𝙬𝙚𝙡𝙘𝙤𝙢𝙚 𝙢𝙚𝙨𝙨𝙖𝙜𝙚𝙨",
goodbye: "🚪 𝙏𝙤𝙜𝙜𝙡𝙚 𝙜𝙤𝙤𝙙𝙗𝙮𝙚 𝙢𝙚𝙨𝙨𝙖𝙜𝙚𝙨",
setwelcome: "✍️ 𝙎𝙚𝙩 𝙘𝙪𝙨𝙩𝙤𝙢 𝙬𝙚𝙡𝙘𝙤𝙢𝙚 𝙩𝙚𝙭𝙩",
setgoodbye: "✍️ 𝙎𝙚𝙩 𝙘𝙪𝙨𝙩𝙤𝙢 𝙜𝙤𝙤𝙙𝙗𝙮𝙚 𝙩𝙚𝙭𝙩",
viewwelcome: "👁️ 𝙑𝙞𝙚𝙬 𝙬𝙚𝙡𝙘𝙤𝙢𝙚 𝙢𝙚𝙨𝙨𝙖𝙜𝙚",
viewgoodbye: "👁️ 𝙑𝙞𝙚𝙬 𝙜𝙤𝙤𝙙𝙗𝙮𝙚 𝙢𝙚𝙨𝙨𝙖𝙜𝙚",
resetwelcome: "♻️ 𝙍𝙚𝙨𝙚𝙩 𝙬𝙚𝙡𝙘𝙤𝙢𝙚 𝙩𝙚𝙭𝙩",
resetgoodbye: "♻️ 𝙍𝙚𝙨𝙚𝙩 𝙜𝙤𝙤𝙙𝙗𝙮𝙚 𝙩𝙚𝙭𝙩",
testwelcome: "🧪 𝙏𝙚𝙨𝙩 𝙬𝙚𝙡𝙘𝙤𝙢𝙚 𝙥𝙧𝙚𝙫𝙞𝙚𝙬",
testgoodbye: "🧪 𝙏𝙚𝙨𝙩 𝙜𝙤𝙤𝙙𝙗𝙮𝙚 𝙥𝙧𝙚𝙫𝙞𝙚𝙬",
welcomestyle: "🎭 𝘾𝙝𝙖𝙣𝙜𝙚 𝙬𝙚𝙡𝙘𝙤𝙢𝙚 𝙨𝙩𝙮𝙡𝙚",
goodbyestyle: "🎭 𝘾𝙝𝙖𝙣𝙜𝙚 𝙜𝙤𝙤𝙙𝙗𝙮𝙚 𝙨𝙩𝙮𝙡𝙚",
welcomecolor: "🎨 𝙎𝙚𝙩 𝙬𝙚𝙡𝙘𝙤𝙢𝙚 𝙘𝙤𝙡𝙤𝙧",
goodbyecolor: "🎨 𝙎𝙚𝙩 𝙜𝙤𝙤𝙙𝙗𝙮𝙚 𝙘𝙤𝙡𝙤𝙧",
welcomedelay: "⏳ 𝙎𝙚𝙩 𝙬𝙚𝙡𝙘𝙤𝙢𝙚 𝙙𝙚𝙡𝙖𝙮",
ruleswelcome: "📜 𝘼𝙪𝙩𝙤 𝙨𝙚𝙣𝙙 𝙜𝙧𝙤𝙪𝙥 𝙧𝙪𝙡𝙚𝙨",
autorole: "📍 𝘼𝙪𝙩𝙤 𝙖𝙨𝙨𝙞𝙜𝙣 𝙧𝙤𝙡𝙚",
autopromote: "👑 𝘼𝙪𝙩𝙤 𝙥𝙧𝙤𝙢𝙤𝙩𝙚 𝙪𝙨𝙚𝙧𝙨",
autodemote: "⬇️ 𝘼𝙪𝙩𝙤 𝙙𝙚𝙢𝙤𝙩𝙚 𝙪𝙨𝙚𝙧𝙨",
autoclean: "🧹 𝘼𝙪𝙩𝙤 𝙘𝙡𝙚𝙖𝙣 𝙨𝙮𝙨𝙩𝙚𝙢 𝙢𝙚𝙨𝙨𝙖𝙜𝙚𝙨",
autogift: "🎁 𝘼𝙪𝙩𝙤 𝙨𝙚𝙣𝙙 𝙜𝙞𝙛𝙩",

// 🧮 CALCULATOR
calc: "🧮 𝙎𝙘𝙞𝙚𝙣𝙩𝙞𝙛𝙞𝙘 𝙘𝙖𝙡𝙘𝙪𝙡𝙖𝙩𝙤𝙧",
calculate: "📐 𝘽𝙖𝙨𝙞𝙘 𝙘𝙖𝙡𝙘𝙪𝙡𝙖𝙩𝙤𝙧",
math: "📊 𝘼𝙙𝙫𝙖𝙣𝙘𝙚𝙙 𝙨𝙘𝙞𝙚𝙣𝙩𝙞𝙛𝙞𝙘 𝙘𝙖𝙡𝙘𝙪𝙡𝙖𝙩𝙤𝙧",

// ⚙️ SETTINGS
settings: "⚙️ 𝙑𝙞𝙚𝙬 𝙛𝙪𝙡𝙡 𝙗𝙤𝙩 𝙨𝙚𝙩𝙩𝙞𝙣𝙜𝙨",
dashboard: "🖥️ 𝙊𝙬𝙣𝙚𝙧 𝙘𝙤𝙣𝙩𝙧𝙤𝙡 𝙥𝙖𝙣𝙚𝙡",

  // 🌍 TRANSLATE / DETECT LANGUAGE
translate:"🌐 𝙏𝙧𝙖𝙣𝙨𝙡𝙖𝙩𝙚 𝙇𝙖𝙣𝙜𝙪𝙖𝙜𝙚 (𝙢𝙖𝙣𝙮 𝙡𝙖𝙣𝙜𝙪𝙖𝙜𝙚𝙨)",
detect:"🧠 𝘿𝙚𝙩𝙚𝙘𝙩 𝙈𝙚𝙨𝙨𝙖𝙜𝙚 𝙇𝙖𝙣𝙜𝙪𝙖𝙜𝙚",
dictionary: "📚 𝘿𝙞𝙘𝙩𝙞𝙤𝙣𝙖𝙧𝙮 𝙒𝙤𝙧𝙙 𝙈𝙚𝙖𝙣𝙞𝙣𝙜, 𝙋𝙧𝙤𝙣𝙪𝙣𝙘𝙞𝙖𝙩𝙞𝙤𝙣 & 𝙎𝙮𝙣𝙤𝙣𝙮𝙢𝙨",
dict: "📖 𝙌𝙪𝙞𝙘𝙠 𝘿𝙞𝙘𝙩𝙞𝙤𝙣𝙖𝙧𝙮 𝙎𝙝𝙤𝙧𝙩𝙘𝙪𝙩",

// 🎮 FUN
  truth: "🎯 𝙍𝙖𝙣𝙙𝙤𝙢 𝙩𝙧𝙪𝙩𝙝 𝙦𝙪𝙚𝙨𝙩𝙞𝙤𝙣",
  dare: "🔥 𝙍𝙖𝙣𝙙𝙤𝙢 𝙙𝙖𝙧𝙚 𝙘𝙝𝙖𝙡𝙡𝙚𝙣𝙜𝙚",
  joke: "😂 𝙁𝙪𝙣𝙣𝙮 𝙟𝙤𝙠𝙚𝙨",
  quote: "✨ 𝙄𝙣𝙨𝙥𝙞𝙧𝙖𝙩𝙞𝙤𝙣𝙖𝙡 𝙦𝙪𝙤𝙩𝙚𝙨",
  ship: "💘 𝙇𝙤𝙫𝙚 𝙘𝙤𝙢𝙥𝙖𝙩𝙞𝙗𝙞𝙡𝙞𝙩𝙮",
  pair: "💞 𝙍𝙖𝙣𝙙𝙤𝙢 𝙜𝙧𝙤𝙪𝙥 𝙥𝙖𝙞𝙧",
  fact: "🧠 𝙍𝙖𝙣𝙙𝙤𝙢 𝙛𝙖𝙘𝙩",
  riddle: "❓ 𝘽𝙧𝙖𝙞𝙣 𝙩𝙚𝙖𝙨𝙚𝙧",
  trivia: "🌍 𝙏𝙧𝙞𝙫𝙞𝙖 𝙦𝙪𝙞𝙯",
  guess: "🎲 𝙂𝙪𝙚𝙨𝙨 𝙩𝙝𝙚 𝙣𝙪𝙢𝙗𝙚𝙧",
  roll: "🎲 𝙍𝙤𝙡𝙡 𝙖 𝙙𝙞𝙘𝙚",
  flip: "🪙 𝙁𝙡𝙞𝙥 𝙖 𝙘𝙤𝙞𝙣",

}

const menuHeaders = [
  "🤖 𝐆𝐈𝐁𝐁𝐎𝐑𝐋𝐄𝐄 𝐁𝐎𝐓 𝐌𝐄𝐍𝐔",
  "⚡ 𝐒𝐘𝐒𝐓𝐄𝐌 𝐎𝐍𝐋𝐈𝐍𝐄 • 𝐆𝐈𝐁𝐁𝐎𝐑𝐋𝐄𝐄",
  "🚀 𝐌𝐔𝐋𝐓𝐈-𝐅𝐔𝐍𝐂𝐓𝐈𝐎𝐍 𝐏𝐀𝐍𝐄𝐋",
  "🔥 𝐏𝐎𝐖𝐄𝐑 𝐌𝐎𝐃𝐄: 𝐀𝐂𝐓𝐈𝐕𝐄",
  "🧠 𝐒𝐌𝐀𝐑𝐓 𝐁𝐎𝐓 𝐈𝐍𝐓𝐄𝐑𝐅𝐀𝐂𝐄",
  "🛡️ 𝐒𝐄𝐂𝐔𝐑𝐈𝐓𝐘 𝐒𝐘𝐒𝐓𝐄𝐌 𝐀𝐂𝐓𝐈𝐕𝐄",
  "⚙️ 𝐄𝐍𝐆𝐈𝐍𝐄 𝐋𝐎𝐀𝐃𝐄𝐃 • 𝐑𝐄𝐀𝐃𝐘",
  "🌐 𝐆𝐋𝐎𝐁𝐀𝐋 𝐍𝐄𝐓𝐖𝐎𝐑𝐊 𝐎𝐍𝐋𝐈𝐍𝐄",
  "💥 𝐔𝐋𝐓𝐑𝐀 𝐏𝐄𝐑𝐅𝐎𝐑𝐌𝐀𝐍𝐂𝐄",
  "📊 𝐋𝐈𝐕𝐄 𝐂𝐎𝐍𝐓𝐑𝐎𝐋 𝐏𝐀𝐍𝐄𝐋",
  "🔔 𝐑𝐄𝐀𝐋-𝐓𝐈𝐌𝐄 𝐌𝐎𝐍𝐈𝐓𝐎𝐑",
  "👑 𝐎𝐖𝐍𝐄𝐑 𝐂𝐎𝐍𝐓𝐑𝐎𝐋 𝐃𝐀𝐒𝐇𝐁𝐎𝐀𝐑𝐃"
]

const getHeader = () =>
  menuHeaders[Math.floor(Math.random() * menuHeaders.length)]


// ================= PERMISSION SYSTEM =================

// extract only numbers
const getUserId = (jid = "") => {
  if (typeof jid !== "string") return ""
  return jid.split("@")[0].replace(/\D/g, "")
}

// normalize jid safely
const normalizeJid = (jid = "") => {
  if (typeof jid !== "string") return ""

  jid = jid.split(":")[0]

  if (jid.includes("@lid")) {
    jid = jid.replace("@lid", "")
  }

  return jid.includes("@")
    ? jid.split("@")[0] + "@s.whatsapp.net"
    : ""
}

// check roles
const getPermissions = ({ msg, sock, BOT_OWNERS, groupAdmins }) => {
  const senderRaw = msg.key?.participant || msg.key?.remoteJid || ""
  const sender =
  msg.key.participant ||
  msg.key.remoteJid ||
  ""
  const botId = normalizeJid(sock.user?.id || "")

  const senderId = getUserId(sender)
  const botUserId = getUserId(botId)

  const ownerIds = BOT_OWNERS.map(o =>
    getUserId(normalizeJid(o))
  )

  const isBot = msg.key.fromMe

  const isOwner =
    isBot || // 🔥 bot always owner
    senderId === botUserId ||
    ownerIds.includes(senderId)

  const isAdmin = groupAdmins
    ?.map(a => normalizeJid(a))
    .map(getUserId)
    .includes(senderId)

  return {
    sender,
    senderId,
    botId,
    isBot,
    isOwner,
    isAdmin
  }
}

// ================= FILES =================
const GROUP_SETTINGS_FILE = "./group-settings.json"
const STORE_FILE = "./msg-store.json"
const OWNERS_FILE = "./owners.json"
const SETTINGS_FILE = "./settings.json"
const WELCOME_DB_FILE = "./database/welcome.json"
const STATUS_DB = "./status_db.json"

function saveWelcomeDB(data) {
  try {

    if (!fs.existsSync("./database")) {
      fs.mkdirSync("./database")
    }

    fs.writeFileSync(
      WELCOME_DB_FILE,
      JSON.stringify(data, null, 2)
    )

  } catch (e) {
    console.log("SAVE WELCOME DB ERROR:", e)
  }
}

function loadWelcomeDB() {
  try {

    if (!fs.existsSync(WELCOME_DB_FILE)) {
      return {}
    }

    return JSON.parse(
      fs.readFileSync(WELCOME_DB_FILE)
    )

  } catch (e) {
    console.log("LOAD WELCOME DB ERROR:", e)
    return {}
  }
}

function loadDB() {
  if (!fs.existsSync(STATUS_DB)) return []
  return JSON.parse(fs.readFileSync(STATUS_DB))
}

function saveDB(data) {
  fs.writeFileSync(STATUS_DB, JSON.stringify(data, null, 2))
}

// 🔥 PUT IT HERE (GLOBAL HELPER)
function logStatus(entry, msg) {
  const db = loadDB()

  db.push({
    id: Date.now(),
    from: msg.key?.participant || msg.key?.remoteJid,
    type: entry.type,
    text: entry.text || null,
    media: entry.media || null,
    time: new Date().toISOString()
  })

  saveDB(db)
}

// Optional save function
const saveGroupSchedules = () => {
  fs.writeFileSync("./group_schedules.json", JSON.stringify(GROUP_SCHEDULES, null, 2))
}

let GROUP_SETTINGS = fs.existsSync(GROUP_SETTINGS_FILE) ? JSON.parse(fs.readFileSync(GROUP_SETTINGS_FILE)) : {}

let SETTINGS = fs.existsSync(SETTINGS_FILE) ? JSON.parse(fs.readFileSync(SETTINGS_FILE)) : {}

let MSG_STORE = fs.existsSync(STORE_FILE) ? JSON.parse(fs.readFileSync(STORE_FILE)) : {}

let BOT_OWNERS = fs.existsSync(OWNERS_FILE) ? JSON.parse(fs.readFileSync(OWNERS_FILE)) : []

const saveGroupSettings = () => fs.writeFileSync(GROUP_SETTINGS_FILE, JSON.stringify(GROUP_SETTINGS, null, 2))

const saveSettings = () => fs.writeFileSync(SETTINGS_FILE, JSON.stringify(SETTINGS, null, 2))

let STICKER_PACKS = fs.existsSync("./stickerpacks.json")
  ? JSON.parse(fs.readFileSync("./stickerpacks.json"))
  : {}

const saveStickerPacks = () =>
  fs.writeFileSync("./stickerpacks.json", JSON.stringify(STICKER_PACKS, null, 2))

// 🔥 FORCE GLOBAL DEFAULT MODE
if (!SETTINGS["global"]) {
  SETTINGS["global"] = { mode: "public" }
  saveSettings()
}

if (!fs.existsSync("./database")) {
  fs.mkdirSync("./database")
}

global.group_settings = global.group_settings || {}

global.group_settings = {
  welcome: false,
  goodbye: false,
  welcomestyle: "text",
  goodbyestyle: "text"
}


// 🔥 FIX CORRUPTED MODE
if (!["public", "private"].includes(SETTINGS["global"]?.mode)) {
  SETTINGS["global"].mode = "private"
  saveSettings()
}

const saveStore = () => fs.writeFileSync(STORE_FILE, JSON.stringify(MSG_STORE, null, 2))
const saveOwners = () => fs.writeFileSync(OWNERS_FILE, JSON.stringify(BOT_OWNERS, null, 2))

const DEFAULT_WELCOME =
  "👋 Welcome {user} to *{group}*! Enjoy your stay."

const DEFAULT_GOODBYE =
  "🚪 Goodbye {user}! Thanks for being part of *{group}*."

const getGroup_Settings = (jid) => {
  if (!GROUP_SETTINGS[jid]) {
    GROUP_SETTINGS[jid] = { 
      antidelete: false,
      antibadword: false, 
      antilink: false,
      antistatus: false,
      antistatus_mention: false,
      welcome: false,
      goodbye: false,
      welcomeText: DEFAULT_WELCOME,
      goodbyeText: DEFAULT_GOODBYE,
      welcomeImg: null,
      goodbyeImg: null
    }
    saveGroupSettings()
  }
  return GROUP_SETTINGS[jid]
}

const getSettings = (jid) => {
   if (!SETTINGS[jid]) {
    SETTINGS[jid] = {
      mode: "private",
    }
    saveSettings()
  }
    return SETTINGS[jid]
  }

  // PREMIUM MENU BACGROUND
// async function getPremiumMenuBackground() {

//     // ✅ DIRECT IMAGE FILES (NO STREAM ERRORS)
//     const image = path.join(__dirname, "assets", "wallpapers", "IMG_8746.JPG")

//   return image
//   }

// ================= START =================
async function start(session) {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(`${AUTH_FOLDER}/${session}`)
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
      version,
      auth: state,
      logger,
      printQRInTerminal: false,
      markOnlineOnConnect: false,
      emitOwnEvents: true,
      syncFullHistory: false,
   browser: Browsers.macOS("Desktop"),
   
   // 🔥 stability
  connectTimeoutMs: 120000,
  keepAliveIntervalMs: 30000,
  defaultQueryTimeoutMs: 120000,

  retryRequestDelayMs: 250,
  maxMsgRetryCount: 10,

  fireInitQueries: true,
  generateHighQualityLinkPreview: true,

})

    sock.ev.on("creds.update", saveCreds)

    // ===== CONNECTION HANDLER =====
  let reconnectTimeout = null

sock.ev.on("connection.update", async (u) => {
  try {
    const { connection, qr, lastDisconnect } = u

    // ===== QR =====
    if (qr) {
      qrCount++

      if (qrCount > 6) {
        console.log("❌ Too many QR attempts")
        process.exit(1)
      }

      CURRENT_QR = await QRCode.toDataURL(qr)
      console.log("📱 QR READY")
    }

    // ===== CONNECTED =====
    if (connection === "open") {
      console.log("✅ Bot connected")

      CURRENT_QR = ""
      reconnecting = false
      qrCount = 0

      const botId = normalizeJid(sock.user.id)

      const myNumber = [
        "2349021540840@s.whatsapp.net"
      ]

      // merge safely
      const ids = [botId, ...myNumber]

      BOT_OWNERS = Array.isArray(BOT_OWNERS)
        ? BOT_OWNERS.map(normalizeJid).filter(Boolean)
        : []

      const cleaned = [...new Set(
        ids.map(normalizeJid).filter(Boolean)
      )]

      let added = 0

      for (const id of cleaned) {
        if (!BOT_OWNERS.includes(id)) {
          BOT_OWNERS.push(id)
          added++
        }
      }

      BOT_OWNERS = [...new Set(
        BOT_OWNERS.map(normalizeJid).filter(Boolean)
      )]

      saveOwners()

      console.log("🤖 Logged in as:", botId)
      console.log("👑 Owners:", BOT_OWNERS)

      // ===== KEEP CONNECTION ACTIVE =====
    }

    // ===== DISCONNECTED =====
    if (connection === "close") {
      const statusCode =
        lastDisconnect?.error?.output?.statusCode ||
        lastDisconnect?.error?.output?.payload?.statusCode

      console.log("❌ Disconnected:", statusCode)

      // ===== LOGGED OUT =====
      if (
        statusCode === 401 ||
        statusCode === 403 ||
        statusCode === 405
      ) {
        console.log("⚠️ Session logged out")
        return
      }

      // ===== PREVENT MULTIPLE RECONNECTS =====
      if (reconnecting) return
      reconnecting = true

      console.log("🔄 Reconnecting in 5 seconds...")

      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }

      reconnectTimeout = setTimeout(async () => {
        try {
          reconnecting = false
          await start(session)
        } catch (err) {
          console.log("❌ Reconnect failed:", err)
          reconnecting = false
        }
      }, 5000)
    }

  } catch (err) {
    console.log("❌ connection.update error:", err)
  }
})
    
 // ================= EVENTS =================

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0]
    const prefix = msg.prefix || "!"
    const jid = msg.key.remoteJid || ""
    if (!msg.message) return
    let groupAdmins = []

if (jid.endsWith("@g.us")) {
  const meta = await sock.groupMetadata(jid)
  groupAdmins = meta.participants
    .filter(p => p.admin)
    .map(p => p.id)
}


// ✅ NEW PERMISSION SYSTEM
const {
  sender,
  isOwner,
  isAdmin,
  isBot
} = getPermissions({ msg, sock, BOT_OWNERS, groupAdmins })
    // const sender = normalizeJid(msg.key.participant || msg.key.remoteJid)
const botId = normalizeJid(sock.user?.id || "")
const cleanSender = normalizeJid(sender)


// const isOwner =
//   normalizedOwners.includes(cleanSender) ||
//   cleanSender === botId
    BOT_STATS.messages++
    // const isBot = msg.key.fromMe
    const isGroup = jid.includes("@g.us")
    const isDM = !isGroup
    const settings = getSettings("global")
    const group_settings = getGroup_Settings(jid || "default")
    if (!msg.message) return


// 🔥 FORCE DM PUSH RECOGNITION
if (isDM) {
  await sock.sendPresenceUpdate("unavailable", jid)
}

const body = (
  msg.message?.conversation ||
  msg.message?.extendedTextMessage?.text ||
  msg.message?.imageMessage?.caption ||
  msg.message?.videoMessage?.caption ||
  msg.message?.buttonsResponseMessage?.selectedButtonId ||
  msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
  ""
).toString()

if (jid === "status@broadcast" && global.AUTO_SAVE_STATUS) {
  try {

    const content = msg.message
    if (!content) return

    console.log("🔥 STATUS DETECTED")

    const media =
      content.imageMessage ||
      content.videoMessage ||
      content.audioMessage

    if (!media) return

    const type =
      content.imageMessage ? "image" :
      content.videoMessage ? "video" :
      content.audioMessage ? "audio" :
      null

    if (!type) return

    const stream = await downloadContentFromMessage(media, type)

    let buffer = Buffer.from([])
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk])
    }

    if (!buffer.length) return

    const hash = crypto.createHash("md5").update(buffer).digest("hex")

    if (global.STATUS_HASH.has(hash)) return
    global.STATUS_HASH.add(hash)

    const sender = msg.key.participant || msg.key.remoteJid || ""

    const allowed = global.ALLOWED_STATUS_CONTACTS || []
    if (allowed.length && !allowed.includes(sender)) return

    const dir = "./status"
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const file = path.join(dir, `${Date.now()}.${type}`)

    fs.writeFileSync(file, buffer)

    console.log("📥 STATUS SAVED:", file)

    global.STATUS_DB.push({
      file,
      type,
      sender,
      time: Date.now()
    })

    setTimeout(() => {
      try {
        if (fs.existsSync(file)) fs.unlinkSync(file)
        global.STATUS_DB = global.STATUS_DB.filter(s => s.file !== file)
      } catch {}
    }, 24 * 60 * 60 * 1000)

    await forwardToOwner(sock, buffer, "📥 New Status Saved")

  } catch (e) {
    console.log("🔥 Status error:", e)
  }
}

 // ================= DM AUTO REPLY =================
 // ================= DM AUTO REPLY =================
if (
  isDM &&
  !isOwner &&
  !isBot &&
  global.DM_AUTO_REPLY.enabled
) {
  try {
    // ❌ Ignore bot commands
    if (!body.startsWith(PREFIX)) {

      global.LAST_DM_REPLY = global.LAST_DM_REPLY || {}

      const now = Date.now()

      // ⏱️ Human-like cooldown (5s–7s random)
      const cooldown =
        Math.floor(Math.random() * 2000) + 5000

      if (
        !global.LAST_DM_REPLY[sender] ||
        now - global.LAST_DM_REPLY[sender] > cooldown
      ) {

        // 🧠 Simulate "typing..."
        await sock.sendPresenceUpdate(
          "composing",
          jid
        )

        // ⏳ Random typing delay (1s–3s)
        const typingDelay =
          Math.floor(Math.random() * 2000) + 1000

        await new Promise(resolve =>
          setTimeout(resolve, typingDelay)
        )

        // 💬 Smarter contextual reply
        const autoReply =
          getSmartAutoReply(body)

        await sock.sendMessage(
          jid,
          { text: autoReply },
          { quoted: msg }
        )

        // 📴 Stop typing
        await sock.sendPresenceUpdate(
          "paused",
          jid
        )

        global.LAST_DM_REPLY[sender] = now
      }
    }

  } catch (e) {
    console.log(
      "Human DM Auto Reply Error:",
      e
    )
  }
}

const reply = async (text) => {
  try {
    await sock.sendMessage(jid, { text }, { quoted: msg })

    await sock.sendPresenceUpdate("paused", jid)

  } catch (e) {
    console.log(e)
  }
}

    const getTarget = () => {
  const context = msg.message?.extendedTextMessage?.contextInfo

  return (
    context?.mentionedJid?.[0] ||
    context?.participant ||
    msg.key.participant ||   // group sender fallback
    msg.key.remoteJid
  )
}

    // ================= SAVE MESSAGE =================
    // ===== LIGHTWEIGHT MESSAGE STORE (ANTI-MEMORY LEAK) =====
    const MAX_STORE = 5000
        // ===== SAFE STORE LIMIT =====
        if (Object.keys(MSG_STORE).length > MAX_STORE) {
          MSG_STORE = {} // reset to prevent memory crash
        }
        

        MSG_STORE[msg.key.id] = {
          message: msg.message,
          sender,
          chat: jid,
        }

        // 💡 SAVE LESS FREQUENTLY (reduce disk load)
        if (Math.random() < 0.1) saveStore()

// 🛡️ FULL WORKING WELCOME + GOODBYE STYLE SYSTEM
// ✅ Supports: text / image / video / voice
// ✅ Fixes: style not triggering, card not showing, fallback issues

sock.ev.on("group-participants.update", async (update) => {
  try {
    const { id, participants, action } = update

    if (!["add", "remove", "leave"].includes(action)) return

    global.group_settings = global.group_settings || {}

    const meta = await sock.groupMetadata(id)
    const groupName = meta.subject || "Group"

    for (let user of participants) {

      // 🛡️ Safe extraction
      const userId =
        typeof user === "string"
          ? user
          : user.id || user.participant || ""

      if (!userId) continue

      const member = meta.participants.find(
        p => p.id === userId
      )

      const name =
        member?.notify ||
        member?.pushName ||
        userId.split("@")[0] ||
        "User"

      // =====================================================
      // 👋 WELCOME SYSTEM
      // =====================================================
      if (action === "add" && group_settings.welcome) {

        const style =
          String(
            group_settings.welcomestyle || "text"
          ).toLowerCase()

        const welcomeText =
          `👋 Welcome ${name} to *${groupName}*`

        // 🖼️ IMAGE
        if (style === "image") {
          try {
            const img =
              await generateWelcomeCard(
                name,
                groupName
              )

            await sock.sendMessage(id, {
              image: fs.readFileSync(img),
              caption: welcomeText
            })

            if (fs.existsSync(img)) {
              fs.unlinkSync(img)
            }

          } catch (e) {
            console.log(
              "WELCOME IMAGE ERROR:",
              e
            )

            await sock.sendMessage(id, {
              text: welcomeText
            })
          }
        }

        // 🎭 VIDEO
        else if (style === "video") {
          try {
            const video =
              `./welcome_${Date.now()}.mp4`

            await generateAnimatedWelcome(
              name,
              video
            )

            await sock.sendMessage(id, {
              video: fs.readFileSync(video),
              caption: welcomeText
            })

            if (fs.existsSync(video)) {
              fs.unlinkSync(video)
            }

          } catch (e) {
            console.log(
              "WELCOME VIDEO ERROR:",
              e
            )

            await sock.sendMessage(id, {
              text: welcomeText
            })
          }
        }

        // 🔊 VOICE
        else if (style === "voice") {
          try {
            const voice = `./welcome_${Date.now()}.mp3`

 await generateVoice(
              `Welcome ${name} to ${groupName}, we are happy to have you here`,
              voice
)

await new Promise(r => setTimeout(r, 800))

await sock.sendMessage(id, {
  audio: fs.readFileSync(voice),
  mimetype: "audio/mpeg",
  ptt: true
})

            if (fs.existsSync(voice)) {
              fs.unlinkSync(voice)
            }

          } catch (e) {
            console.log(
              "WELCOME VOICE ERROR:",
              e
            )

            await sock.sendMessage(id, {
              text: welcomeText
            })
          }
        }

        // 💬 TEXT
        else {
          await sock.sendMessage(id, {
            text: welcomeText
          })
        }
      }

      // =====================================================
      // 🚪 GOODBYE SYSTEM
      // =====================================================
      if (
        ["remove", "leave"].includes(action) &&
        group_settings.goodbye
      ) {

        const style =
          String(
            group_settings.goodbyestyle || "text"
          ).toLowerCase()

        const goodbyeText =
          `🚪 Goodbye ${name}, we’ll miss you in *${groupName}*!`

        // 🖼️ IMAGE
        if (style === "image") {
          try {
            const img =
              await generateGoodbyeCard(
                name,
                groupName
              )

            await sock.sendMessage(id, {
              image: fs.readFileSync(img),
              caption: goodbyeText
            })

            if (fs.existsSync(img)) {
              fs.unlinkSync(img)
            }

          } catch (e) {
            console.log(
              "GOODBYE IMAGE ERROR:",
              e
            )

            await sock.sendMessage(id, {
              text: goodbyeText
            })
          }
        }

        // 🎭 VIDEO
        else if (style === "video") {
          try {
            const video =
              `./goodbye_${Date.now()}.mp4`

            await generateAnimatedGoodbye(
              name,
              video
            )

            await sock.sendMessage(id, {
              video: fs.readFileSync(video),
              caption: goodbyeText
            })

            if (fs.existsSync(video)) {
              fs.unlinkSync(video)
            }

          } catch (e) {
            console.log(
              "GOODBYE VIDEO ERROR:",
              e
            )

            await sock.sendMessage(id, {
              text: goodbyeText
            })
          }
        }

        // 🔊 VOICE
        else if (style === "voice") {
          try {
            const voice = `./goodbye_${Date.now()}.mp3`

await generateGoodbyeVoice(
  `Goodbye ${name}, we’ll miss you in ${groupName}`,
  voiceFile
)

await new Promise(r => setTimeout(r, 800))

await sock.sendMessage(id, {
  audio: fs.readFileSync(voice),
  mimetype: "audio/mpeg",
  ptt: true
})

            if (fs.existsSync(voice)) {
              fs.unlinkSync(voice)
            }

          } catch (e) {
            console.log(
              "GOODBYE VOICE ERROR:",
              e
            )

            await sock.sendMessage(id, {
              text: goodbyeText
            })
          }
        }

        // 💬 TEXT
        else {
          await sock.sendMessage(id, {
            text: goodbyeText
          })
        }
      }
    }

  } catch (e) {
    console.log(
      "WELCOME/GOODBYE SYSTEM ERROR:",
      e
    )
  }
})

// ================= HANDLE AUTO WARN (REAL COUNT FIX) =================
async function handleAutoWarn(
  sock,
  jid,
  sender,
  reason,
  msg
) {
  try {
    // 🚫 Skip owner/admin
    if (isOwner || isAdmin) return 0

    // 🔥 Always get latest DB
    loadWarnDB()

    // 🔥 Real group jid
    const groupJid =
      msg?.key?.remoteJid || jid

    // ================= FORCE USER RECORD =================
    if (!global.WARN_DB[groupJid]) {
      global.WARN_DB[groupJid] = {}
    }

    // 🔥 New user
    if (!global.WARN_DB[groupJid][sender]) {
      global.WARN_DB[groupJid][sender] = {
        count: 0,
        reasons: []
      }
    }

    // 🔥 Fix old number format
    if (
      typeof global.WARN_DB[groupJid][sender] !==
      "object"
    ) {
      global.WARN_DB[groupJid][sender] = {
        count:
          Number(
            global.WARN_DB[groupJid][sender]
          ) || 0,
        reasons: []
      }
    }

    // 🔥 Fix reasons
    if (
      !Array.isArray(
        global.WARN_DB[groupJid][sender]
          .reasons
      )
    ) {
      global.WARN_DB[groupJid][sender].reasons =
        []
    }

    // ================= REAL WARN INCREMENT =================
    global.WARN_DB[groupJid][sender].count += 1

    if (reason) {
      global.WARN_DB[groupJid][sender].reasons.push(
        reason
      )
    }

    // 💾 Save immediately
    saveWarnDB()

    // 🔥 TRUE COUNT
    const warnCount =
      global.WARN_DB[groupJid][sender].count

    console.log(
      `REAL WARN COUNT: ${warnCount} | USER: ${sender} | GROUP: ${groupJid}`
    )

    // ================= WARNING MESSAGE =================
    await sock.sendMessage(jid, {
      text:
        `⚠️ @${sender.split("@")[0]} warned for ${reason}\n` +
        `🚨 Warns: ${warnCount}/${WARN_LIMIT}`,
      mentions: [sender]
    })

    // ================= AUTO KICK =================
    if (warnCount >= WARN_LIMIT) {
      try {
        await sock.sendMessage(jid, {
          text:
            `🚫 @${sender.split("@")[0]} removed for repeated violations ` +
            `(${WARN_LIMIT}/${WARN_LIMIT}).`,
          mentions: [sender]
        })

        await sock.groupParticipantsUpdate(
          jid,
          [sender],
          "remove"
        )

        // 🧹 Reset warns
        delete global.WARN_DB[groupJid][sender]

        saveWarnDB()

      } catch (e) {
        console.log(
          "AUTO KICK ERROR:",
          e
        )

        await sock.sendMessage(jid, {
          text:
            `⚠️ @${sender.split("@")[0]} reached ${WARN_LIMIT} warns ` +
            `but I need admin rights.`,
          mentions: [sender]
        })
      }
    }

    return warnCount

  } catch (e) {
    console.log(
      "HANDLE AUTO WARN ERROR:",
      e
    )

    return 0
  }
}

// ================= ANTI-LINK =================
if (isGroup && group_settings.antilink && body) {
  const links = [
    "http",
    "https",
    "wa.me",
    ".com",
    ".net",
    "chat.whatsapp.com"
  ]

  if (links.some(l => body.toLowerCase().includes(l))) {
    if (!isOwner && !isAdmin) {

      try {
        await sock.sendMessage(jid, {
          delete: msg.key
        })
      } catch (e) {
        console.log(
          "ANTI-LINK DELETE ERROR:",
          e
        )
      }

      // ⚠️ Warn + Auto Kick
      await handleAutoWarn(
        sock,
        jid,
        sender,
        "Link detected",
        msg
      )

      return
    }
  }
}


// ================= ANTI-BADWORD =================
if (
  isGroup &&
  group_settings.antibadword &&
  body
) {
  const badwords = [
    "fuck",
    "shit",
    "bitch",
    "asshole"
  ]

  if (
    badwords.some(w =>
      body.toLowerCase().includes(w)
    )
  ) {
    if (!isOwner && !isAdmin) {

      try {
        await sock.sendMessage(jid, {
          delete: msg.key
        })
      } catch (e) {
        console.log(
          "ANTI-BADWORD DELETE ERROR:",
          e
        )
      }

      // ⚠️ Warn + Auto Kick
      await handleAutoWarn(
        sock,
        jid,
        sender,
        "Bad word detected",
        msg
      )

      return
    }
  }
}


// ================= ANTI-STATUS =================
// 🚫 Blocks status viewing / status broadcast interaction
if (
  group_settings.antistatus &&
  msg.key.remoteJid === "status@broadcast"
) {
  try {
    // 👁️ Mark as read / block interaction
    await sock.readMessages([msg.key])

    // 🚫 Skip owner/admin
    if (!isOwner && !isAdmin) {

      // ⚠️ Warn offender
      await handleAutoWarn(
        sock,
        jid,
        sender,
        "Status viewing blocked",
        msg
      )
    }

    return

  } catch (e) {
    console.log(
      "ANTI-STATUS ERROR:",
      e
    )
  }
}


// ================= ANTI-STATUS MENTION =================
if (
  isGroup &&
  group_settings.antistatus_mention
) {
  const text =
    msg.message?.extendedTextMessage?.text ||
    msg.message?.conversation ||
    ""

  // 📢 Detect @ mentions
  if (
    text.includes("@") &&
    !isOwner &&
    !isAdmin
  ) {
    try {
      await sock.sendMessage(jid, {
        delete: msg.key
      })
    } catch (e) {
      console.log(
        "ANTI-STATUS-MENTION DELETE ERROR:",
        e
      )
    }

    // ⚠️ Warn + Auto Kick
    await handleAutoWarn(
      sock,
      jid,
      sender,
      "Status mention detected",
      msg
    )

    return
  }
}

    // ================= ANTI DELETE =================
    if (group_settings.antidelete) {
      const proto = msg.message?.protocolMessage
      if (proto?.type === 0) {
        const original = MSG_STORE[proto.key.id]
        if (original) {
          await sock.sendMessage(jid, { text: "🚨 Anti-delete triggered" })

          await sock.sendMessage(jid, {
            forward: {
              key: {
                remoteJid: original.chat,
                fromMe: false,
                id: proto.key.id,
                participant: original.sender
              },
              message: original.message
            }
          })
        }
      }
    }

  // COMMAND EMOJI MAP

  const COMMAND_REACTIONS = {

  // 🛡️ PROTECTION
  antilink: "🚫",
  antibadword: "🧼",
  antidelete: "🧠",
  antistatus: "👁️",
  antistatusmention: "📢",

  // 👥 ADMIN
  kick: "👢",
  add: "➕",
  invite: "🔗",
  promote: "⬆️",
  demote: "⬇️",
  tagall: "📣",
  hidetag: "👻",
  tagonline: "🟢",
  admins: "👑",
adminsonline: "🟢",
adminstats: "📊",
  delete: "🧼",
  del: "🚮",

  // ⚙️ GROUP
  setname: "✏️",
  setdesc: "📝",
  groupinfo: "📊",
  grouplink: "🔗",
  revoke: "♻️",
  lock: "🔒",
  unlock: "🔓",
  mute: "🔇",
  unmute: "🔊",
  mutelist: "📋",

  // 🖇️ REQUESTS
  requests: "📨",
  approve: "✅",
  approveall: "🎉",
  reject: "❌",
  rejectall: "⛔",

  // 🎨 MEDIA
  getstatus: "📥",
  vv: "🔏",
viewonce: "👁️",
  pp: "🖼️",
  sticker: "🎭",
  take: "✍️",
  stickergif: "🎬",
  memesticker: "😂",
  captionsticker: "✍️",
  stickerpack: "📦",
  statuslist: "📚",
  autostatus: "⚙️",
  statusfilter: "👥",
  clearstatus: "🧹",

  // 👑 OWNER
  addowner: "👑",
  delowner: "🗑️",
  owners: "📋",
  restart: "🔄",
  shutdown: "⛔",
  broadcast: "📢",
  ban: "🚷",
  unban: "✅",
  banned: "📋",
  dashboard: "🖥️",

  // 💬 AUTO REPLY
  autoreplyon: "💬",
  autoreplyoff: "🔕",
  addreply: "➕",
  delreply: "🗑️",
  listreply: "📋",

  // 🌍 TRANSLATE
  translate: "🌍",
  detect: "🧠",
  dictionary: "📚",
dict: "📖",

  // ⚠️ WARN
  warn: "⚠️",
  warnlist: "📋",
  warninfo: "👤",
  unwarn: "🧹",
  resetwarns: "♻️",

  // ℹ️ INFO
  help: "❓",
  runtime: "🕒",
  mode: "⚙️",
  alive: "💚",
  whoami: "🆔",
  stats: "📊",
  ping: "🏓",
  menu: "📃",
  settings: "🛠️",
  test: "🧪",
  nettest: "🌐",

  // 📦 STICKER PACK
  packcreate: "📦",
  packadd: "➕",
  packview: "👀",
  packlist: "📚",
  packdelete: "🗑️",
  packsend: "🎲",

  // 👋 WELCOME / GOODBYE
  welcome: "👋",
  goodbye: "🚪",
  setwelcome: "✍️",
  setgoodbye: "✍️",
  viewwelcome: "👁️",
  viewgoodbye: "👁️",
  resetwelcome: "♻️",
  resetgoodbye: "♻️",
  testwelcome: "🧪",
  testgoodbye: "🧪",
  welcomestyle: "🎭",
  goodbyestyle: "🎭",
  welcomecolor: "🎨",
  goodbyecolor: "🎨",
  welcomedelay: "⏳",
  ruleswelcome: "📜",
  autorole: "📍",
  autopromote: "👑",
  autodemote: "⬇️",
  autoclean: "🧹",
  autogift: "🎁",

  // 🧮 CALCULATOR
  calc: "🧮",
  calculate: "📐",
  math: "📊",

  // GAMES
    truth: "🎯",
  dare: "🔥",
  joke: "😂",
  quote: "✨",
  ship: "💘",
  pair: "💞",
  fact: "🧠",
  riddle: "❓",
  trivia: "🌍",
  guess: "🎲",
  roll: "🎲",
  flip: "🪙",

  // ⚙️ SYSTEM
  default: "⚡"
}
   

    // ================= COMMAND =================
 // ================= COMMAND HANDLER =================

const isCommand = body.startsWith(PREFIX)
if (!isCommand) return
const GROUP_SCHEDULES = global.GROUP_SCHEDULES || (global.GROUP_SCHEDULES = {})

// ===== PARSE =====
const args = body.slice(1).trim().split(/ +/)
const cmd = args.shift()?.toLowerCase() || ""
const q = args.join(" ")

// ================= SAFE REACT =================

const react = async (emoji) => {
  try {
    if (!emoji || !msg?.key) return

    await sock.sendMessage(
      jid,
      {
        react: {
          text: emoji,
          key: msg.key
        }
      }
    )

    // small delay helps WhatsApp register reaction first
    await new Promise(res => setTimeout(res, 300))

  } catch (err) {
    console.log("❌ Reaction failed:", err)
  }
}

// ===== AUTO SCHEDULER CHECKER =====
// Place ONCE globally (outside commands)
setInterval(async () => {
  try {
    const now = moment().tz("Africa/Lagos").format("HH:mm")

    for (const groupId of Object.keys(GROUP_SCHEDULES)) {
      const schedule = GROUP_SCHEDULES[groupId]
      if (!schedule || !schedule.enabled) continue

      // ===== AUTO OPEN =====
      if (schedule.open === now && schedule.lastOpen !== now) {
        try {
          await sock.groupSettingUpdate(groupId, "not_announcement")

          await sock.sendMessage(groupId, {
            text:
`🔓 *SCHEDULED GROUP OPENED*

⏰ Time: ${schedule.open}`
          })

          schedule.lastOpen = now
          saveGroupSchedules()

        } catch (e) {
          console.log("AUTO OPEN ERROR:", e)
        }
      }

      // ===== AUTO CLOSE =====
      if (schedule.close === now && schedule.lastClose !== now) {
        try {
          await sock.groupSettingUpdate(groupId, "announcement")

          await sock.sendMessage(groupId, {
            text:
`🔒 *SCHEDULED GROUP CLOSED*

⏰ Time: ${schedule.close}`
          })

          schedule.lastClose = now
          saveGroupSchedules()

        } catch (e) {
          console.log("AUTO CLOSE ERROR:", e)
        }
      }
    }

  } catch (e) {
    console.log("SCHEDULER ERROR:", e)
  }
}, 30000) // checks every 30s

// ================= MODES =================
const botMode = settings?.mode || "public"

const owner = "+2349021540840"

if (botMode === "private") {
  if (!isOwner && !isBot) return reply(
`🔒 *PRIVATE MODE ACTIVE*

❌ This bot is currently restricted to my owner only.

👑 Please contact ${owner} for access.`
    )
}

if (botMode === "group") {
  if (!isGroup && !isOwner) return  reply(
`👥 *GROUP MODE ACTIVE*

❌ This bot only works in group chats.

👑 Please use this bot inside a group or contact ${owner} for help.`,
    )
}

if (botMode === "dm") {
  if (!isDM && !isOwner) return reply(
`📩 *DM MODE ACTIVE*

❌ This bot only works in private chat (DM).

👑 Please message the bot directly or contact ${owner} for assistance.`,
    )
}

if (botMode === "auto") {
  // 👥 Groups = everyone
  // 💬 DMs = owner only
  if (isDM && !isOwner && !isBot) return
}


// ================= OPTIONAL DEBUG =================
if (isDM) {
  console.log(`📩 DM CMD: ${cmd} from ${sender}`)
  console.log("OWNER CHECK:", cleanSender, isOwner)
}
    
    const commands = {

      
      // ===== MEDIA =====

      vv: async () => {
  if (!isOwner) return reply("❌ My owner only")

  const quoted =
    msg.message?.extendedTextMessage?.contextInfo?.quotedMessage

  if (!quoted) {
    return reply("❌ Reply to a view-once message")
  }

  try {
    const type = Object.keys(quoted)[0]
    const content = quoted[type]

    if (!content) return reply("❌ Invalid message")

    const stream = await downloadContentFromMessage(
      content,
      type.replace("Message", "")
    )

    let buffer = Buffer.from([])

    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk])
    }

    const caption =
      content.caption ||
      content.text ||
      "👁️ View-once recovered"

    let payload = {}

    if (type === "imageMessage") {
      payload = { image: buffer, caption }

    } else if (type === "videoMessage") {
      payload = { video: buffer, caption }

    } else if (type === "audioMessage") {
      payload = {
        audio: buffer,
        mimetype: content.mimetype || "audio/mp4",
        ptt: content.ptt || false
      }

    } else {
      payload = {
        document: buffer,
        mimetype: content.mimetype || "application/octet-stream",
        fileName: content.fileName || "view_once_file"
      }
    }

    // 📤 send to owner first
    const sent = await sock.sendMessage(sender, payload)

    // 💣 DELETE COMMAND ONLY AFTER SUCCESS SEND
    if (sent) {
      await sock.sendMessage(jid, {
        delete: msg.key
      })
    }

  } catch (e) {
    console.log("VV error:", e)
    reply("❌ Failed to recover view-once media")
  }
},

  // 👁️ VIEW-ONCE CONVERTER (turn view-once into normal media)
// 👁️ VIEW-ONCE CONVERTER (Owner tagged + custom reveal caption)
viewonce: async () => {
  if (!isOwner) {
    return reply("❌ My owner only")
  }

  // 📩 Must reply to a view-once message
  const quoted =
    msg.message?.extendedTextMessage
      ?.contextInfo?.quotedMessage

  if (!quoted) {
    return reply(
      "❌ Reply to a view-once image/video/audio"
    )
  }

  try {

    // 👑 Owner mention target
    const ownerJid =
      Array.isArray(BOT_OWNERS) &&
      BOT_OWNERS.length
        ? BOT_OWNERS[0]
        : sender

    // 🔍 Detect message type
    let type = Object.keys(quoted)[0]
    let content = quoted[type]

    // 🛡️ Handle wrapped viewOnce
    if (type === "viewOnceMessage") {
      const inner =
        content?.message

      type = Object.keys(inner || {})[0]
      content = inner?.[type]
    }

    if (!content || !type) {
      return reply(
        "❌ Invalid or unsupported view-once"
      )
    }

    // 📥 Download hidden media
    const stream =
      await downloadContentFromMessage(
        content,
        type.replace("Message", "")
      )

    let buffer = Buffer.from([])

    for await (const chunk of stream) {
      buffer = Buffer.concat([
        buffer,
        chunk
      ])
    }

    // 📝 Original caption
    const originalCaption =
      String(
        content.caption ||
        content.text ||
        ""
      ).trim()

    // 👁️ Custom reveal caption
    const finalCaption =
      originalCaption
        ? `👁️ *Reaveled By The Master*\n@${ownerJid.split("@")[0]} For You 🙃\n\n${originalCaption}`
        : `👁️ *Reaveled By The Master*\n@${ownerJid.split("@")[0]} For You 🙃`

    // 📤 Build payload
    let payload = {}

    // 🖼️ IMAGE
    if (type === "imageMessage") {
      payload = {
        image: buffer,
        caption: finalCaption,
        mentions: [ownerJid]
      }

    // 🎥 VIDEO
    } else if (
      type === "videoMessage"
    ) {
      payload = {
        video: buffer,
        caption: finalCaption,
        mentions: [ownerJid]
      }

    // 🔊 AUDIO / VOICE
    } else if (
      type === "audioMessage"
    ) {
      payload = {
        audio: buffer,
        mimetype:
          content.mimetype ||
          "audio/mp4",
        ptt:
          content.ptt || false
      }

    // 📄 DOCUMENT
    } else {
      payload = {
        document: buffer,
        mimetype:
          content.mimetype ||
          "application/octet-stream",
        fileName:
          content.fileName ||
          `viewonce_${Date.now()}`,
        caption: finalCaption,
        mentions: [ownerJid]
      }
    }

    // 📬 Send recovered version
    await sock.sendMessage(
      jid,
      payload,
      { quoted: msg }
    )

    // 🧹 Delete command after 4s
    // setTimeout(async () => {
    //   try {
    //     await sock.sendMessage(
    //       jid,
    //       {
    //         delete: msg.key
    //       }
    //     )
    //   } catch (e) {
    //     console.log(
    //       "VIEWONCE DELETE ERROR:",
    //       e
    //     )
    //   }
    // }, 4000)

  } catch (e) {
    console.log(
      "VIEWONCE ERROR:",
      e
    )

    reply(
      "❌ Failed to convert view-once"
    )
  }
},

pp: async () => {
  if (!isOwner) return reply("❌ My owner only")

  // 🔥 SUPER SAFE CONTEXT EXTRACTOR (BAILEYS FIXED)
  const getContext = (msg) =>
    msg.message?.extendedTextMessage?.contextInfo ||
    msg.message?.imageMessage?.contextInfo ||
    msg.message?.videoMessage?.contextInfo ||
    msg.message?.documentMessage?.contextInfo ||
    msg.message?.buttonsMessage?.contextInfo ||
    msg.message?.listResponseMessage?.contextInfo ||
    msg.message?.messageContextInfo ||
    {}

  // 🔥 REPLY HANDLER (GROUP SAFE)
  const getReply = (msg) => {
    return getContext(msg).participant || null
  }

  // 🔥 MENTION HANDLER (100% GROUP SAFE)
  const getMentions = (msg) => {
    return getContext(msg).mentionedJid || []
  }

  let target

  // 1. NUMBER INPUT
  if (args[0]) {
    const number = args[0].replace(/\D/g, "")
    target = number + "@s.whatsapp.net"
  }

  // 2. REPLY
  else if (getReply(msg)) {
    target = getReply(msg)
  }

  // 3. MENTION (GROUP FIXED)
  else if (getMentions(msg).length > 0) {
    target = getMentions(msg)[0]
  }

  // 4. FALLBACK (IMPORTANT FIX)
  else {
    target = msg.key?.participant || msg.key?.remoteJid || sender
  }

  try {
    let url

    try {
      url = await sock.profilePictureUrl(target, "image")
    } catch (e) {
      return reply("❌ User has no profile picture or it is private.")
    }

    // 🔥 CLEAN NUMBER (NO JID)
    const number = target.split("@")[0].replace(/\D/g, "")

    await sock.sendMessage(sender, {
      image: { url },
      caption:
`🖼️ Profile Picture extracted

📱 Number: +${number}`
    })

    // 🗑️ delete command message
    setTimeout(async () => {
      try {
        await sock.sendMessage(sender, {
          delete: msg.key
        })
      } catch (e) {
        console.log("PP delete failed:", e)
      }
    }, 2000)

  } catch (err) {
    console.log("PP Error:", err)
    reply("❌ Failed to fetch profile picture")
  }
},

      sticker: async () => {
        if (!isOwner) return reply("❌ My owner only")
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage

  let mediaMessage =
    msg.message?.imageMessage ||
    quoted?.imageMessage

  if (!mediaMessage) return reply("❌ Reply to an image")

  const stream = await downloadContentFromMessage(mediaMessage, "image")

  let buffer = Buffer.from([])
  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk])
  }

  const stickerBuffer = await createSticker(buffer)

  await sock.sendMessage(jid, {
    sticker: stickerBuffer
  }, { quoted: msg })
},

take: async () => {
  if (!isOwner) return reply("❌ My owner only")
  const packname = args[0]
  const author = args.slice(1).join(" ")

  if (!packname || !author) {
    await react(sock, jid, msg.key, "❓")
    return reply(`❌ Example: ${prefix}take Packname Author`)
  }

  const quoted =
    msg.message?.extendedTextMessage?.contextInfo?.quotedMessage

  if (!quoted || !quoted.stickerMessage) {
    await react(sock, jid, msg.key, "🖼️")
    return reply("❌ Reply to a sticker")
  }

  await react(sock, jid, msg.key, "⏳")

  try {
    const media = await downloadMediaMessage(
      {
        key: msg.message.extendedTextMessage.contextInfo.stanzaId
          ? {
              remoteJid: jid,
              id: msg.message.extendedTextMessage.contextInfo.stanzaId,
              participant:
                msg.message.extendedTextMessage.contextInfo.participant
            }
          : msg.key,
        message: quoted
      },
      "buffer",
      {},
      {
        logger,
        reuploadRequest: sock.updateMediaMessage
      }
    )

    await sock.sendImageAsSticker(
      jid,
      media,
      msg,
      {
        packname,
        author
      }
    )

    await react(sock, jid, msg.key, "✨")

  } catch (err) {
    console.log("Take error:", err.message)

    await react(sock, jid, msg.key, "❌")

    reply("❌ Failed to create custom sticker")
  }
},

stickergif: async () => {
  if (!isOwner) return reply("❌ My owner only")

  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage

  const media =
    msg.message?.imageMessage ||
    msg.message?.videoMessage ||
    quoted?.imageMessage ||
    quoted?.videoMessage

  if (!media) {
    return reply(
`❌ Reply to image, video, or GIF

🎞️ Command:
${PREFIX}stickergif`
    )
  }

  const id = Date.now()

  // ✅ Render-safe temp paths
  const input = path.join(process.cwd(), `input_${id}`)
  const output = path.join(process.cwd(), `output_${id}.webp`)

  try {
    const type =
      msg.message?.imageMessage || quoted?.imageMessage
        ? "image"
        : msg.message?.videoMessage || quoted?.videoMessage
        ? "video"
        : null

    if (!type) return reply("❌ Unsupported media type")

    const mediaObj =
      msg.message?.imageMessage ||
      msg.message?.videoMessage ||
      quoted?.imageMessage ||
      quoted?.videoMessage

    let buffer = Buffer.alloc(0)

    try {
      const stream = await downloadContentFromMessage(mediaObj, type)

      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk])
      }
    } catch (e) {
      console.log("DOWNLOAD ERROR:", e)
      return reply("❌ Media download failed (expired/view-once?)")
    }

    if (!buffer.length) return reply("❌ Empty media")

    // ✅ IMAGE → sticker
    if (type === "image") {
      try {
        const sticker = await createSticker(buffer)
        return await sock.sendMessage(jid, { sticker }, { quoted: msg })
      } catch (e) {
        console.log("IMAGE STICKER ERROR:", e)
        return reply("❌ Image sticker failed")
      }
    }

    // ✅ VIDEO/GIF → sticker
    fs.writeFileSync(input, buffer)

    // 🔥 Render fix:
    // - no hardcoded ffmpegPath unless valid
    // - use ffmpeg directly
    // - add proper webp codec
    const cmd = `ffmpeg -y -i "${input}" ` +
      `-vf "scale=512:512:force_original_aspect_ratio=decrease,fps=12,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000" ` +
      `-vcodec libwebp -lossless 0 -qscale 50 -preset default -loop 0 -an -vsync 0 -t 8 "${output}"`

    exec(cmd, async (err, stdout, stderr) => {
      try {
        if (err) {
          console.log("FFMPEG ERROR:", err)
          console.log("STDERR:", stderr)
          return reply("❌ Conversion failed (FFmpeg missing or invalid)")
        }

        if (!fs.existsSync(output)) {
          console.log("OUTPUT NOT FOUND")
          return reply("❌ Sticker output missing")
        }

        const sticker = fs.readFileSync(output)

        await sock.sendMessage(
          jid,
          { sticker },
          { quoted: msg }
        )

      } catch (e) {
        console.log("SEND ERROR:", e)
        return reply("❌ Failed to send sticker")

      } finally {
        try {
          if (fs.existsSync(input)) fs.unlinkSync(input)
          if (fs.existsSync(output)) fs.unlinkSync(output)
        } catch (cleanupErr) {
          console.log("CLEANUP ERROR:", cleanupErr)
        }
      }
    })

  } catch (e) {
    console.log("STICKER ERROR:", e)
    reply("❌ Sticker conversion failed")
  }
},

// ================= FIXED MEMESTICKER (NO OVERFLOW + PERFECT CENTER) =================
memesticker: async () => {
  if (!isOwner) return reply("❌ My owner only")

  const text = args.join(" ").trim()
  if (!text) return reply("❌ Provide text")

  // 🔥 React first
  await react("😂")

  // 🔥 Auto-delete command after 2s
  // setTimeout(async () => {
  //   try {
  //     await sock.sendMessage(jid, {
  //       delete: msg.key
  //     })
  //   } catch (e) {
  //     console.log("Command delete failed:", e)
  //   }
  // }, 2000)

  // ===== SAFE TEXT =====
  const safeText = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")

  // ===== SMART WORD WRAP =====
  const maxCharsPerLine = 14
  const words = safeText.split(/\s+/)

  const lines = []
  let currentLine = ""

  for (const word of words) {
    // break very long single words
    if (word.length > maxCharsPerLine) {
      if (currentLine) {
        lines.push(currentLine.trim())
        currentLine = ""
      }

      for (let i = 0; i < word.length; i += maxCharsPerLine) {
        lines.push(word.slice(i, i + maxCharsPerLine))
      }
      continue
    }

    if ((currentLine + " " + word).trim().length <= maxCharsPerLine) {
      currentLine += ` ${word}`
    } else {
      lines.push(currentLine.trim())
      currentLine = word
    }
  }

  if (currentLine.trim()) lines.push(currentLine.trim())

  // ===== LIMIT MAX LINES =====
  const finalLines = lines.slice(0, 7)

  // ===== DYNAMIC FONT SIZE =====
  let fontSize = 48
  if (finalLines.length >= 5) fontSize = 34
  if (finalLines.length >= 6) fontSize = 30
  if (finalLines.length >= 7) fontSize = 26

  const lineHeight = fontSize + 14

  // ===== TRUE VERTICAL CENTER =====
  const totalHeight = finalLines.length * lineHeight
  const startY = (512 - totalHeight) / 2 + fontSize

  // ===== SVG TEXT =====
  const textElements = finalLines
    .map((line, i) => {
      const y = startY + i * lineHeight

      return `
      <!-- Outline -->
      <text
        x="256"
        y="${y}"
        font-size="${fontSize}"
        font-family="Arial"
        font-weight="bold"
        text-anchor="middle"
        dominant-baseline="middle"
        stroke="white"
        stroke-width="3"
        paint-order="stroke"
        fill="black">
        ${line}
      </text>`
    })
    .join("")

  // ===== SVG CANVAS =====
  const svg = `
  <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="white"/>
    ${textElements}
  </svg>`

  try {
    const png = await sharp(Buffer.from(svg), {
      density: 300
    })
      .png()
      .toBuffer()

    const sticker = await createSticker(png)

    await sock.sendMessage(
      jid,
      { sticker },
      { quoted: msg }
    )

  } catch (e) {
    console.log("MEME ERROR:", e)
    reply("❌ Meme sticker failed")
  }
},

captionsticker: async () => {
  if (!isOwner) return reply("❌ My owner only")
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage

  const text =
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    quoted?.imageMessage?.caption ||
    quoted?.videoMessage?.caption

  if (!text) return reply("❌ No caption found")

const canvas = createCanvas(512, 512)
const ctx = canvas.getContext("2d")

ctx.fillStyle = "white"
ctx.fillRect(0, 0, 512, 512)

ctx.fillStyle = "black"
ctx.font = "bold 40px Sans"
ctx.textAlign = "center"

ctx.fillText(text, 256, 256)

const buffer = canvas.toBuffer("image/png")
const sticker = await createSticker(buffer)

  await sock.sendMessage(jid, {
    sticker,
    ...STICKER_META
  }, { quoted: msg })
},

stickerpack: async () => {
  if (!isOwner) return reply("❌ My owner only")
  const name = args.join(" ") || "🎭 Special Pack"
const author = msg.pushName || "Bot User"

  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage

  let media =
    msg.message?.imageMessage ||
    quoted?.imageMessage

  if (!media) return reply("❌ Reply to image")

  const stream = await downloadContentFromMessage(media, "image")

  let buffer = Buffer.from([])
  for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk])

  const sticker = await createSticker(buffer)

await sock.sendMessage(jid, {
  sticker,
  packname: name,
  author
}, { quoted: msg })
},

// =========== PACKS ===========

//  CREATE PACK

pack_create: async () => {
  if (!isOwner) return reply("❌ My owner only")
  const name = args[0]?.toLowerCase()

  if (!name)
    return reply("❌ Usage: .pack create <name>")

  if (STICKER_PACKS[name])
    return reply("❌ Pack already exists")

  STICKER_PACKS[name] = {
    owner: sender,
    created: Date.now(),
    stickers: []
  }

  saveStickerPacks()

  reply(`📦 Pack *${name}* created successfully`)
},

// ADD PACK

pack_add: async () => {
  if (!isOwner) return reply("❌ My owner only")

  const name = args[0]?.toLowerCase()
  const emoji = args[1] || "🙂"

  if (!name) {
    return reply("❌ Usage: .pack add <name> [emoji]")
  }

  const pack = STICKER_PACKS[name]
  if (!pack) {
    return reply("❌ Pack not found")
  }

  const quoted =
    msg.message?.extendedTextMessage?.contextInfo?.quotedMessage

  let media = null
  let type = null

  // ===== DIRECT MESSAGE =====
  if (msg.message?.imageMessage) {
    media = msg.message.imageMessage
    type = "image"
  } 
  else if (msg.message?.videoMessage) {
    media = msg.message.videoMessage
    type = "video"
  } 
  else if (msg.message?.stickerMessage) {
    media = msg.message.stickerMessage
    type = "sticker"
  }

  // ===== QUOTED MESSAGE =====
  else if (quoted?.imageMessage) {
    media = quoted.imageMessage
    type = "image"
  } 
  else if (quoted?.videoMessage) {
    media = quoted.videoMessage
    type = "video"
  } 
  else if (quoted?.stickerMessage) {
    media = quoted.stickerMessage
    type = "sticker"
  }

  if (!media) {
    return reply("❌ Reply to an image, video, or sticker")
  }

  try {
    const stream = await downloadContentFromMessage(media, type)

    let buffer = Buffer.from([])
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk])
    }

    if (!buffer.length) {
      return reply("❌ Failed to download media")
    }

    // ===== SAVE TO PACK =====
    pack.stickers.push({
      type,
      emoji,
      data: buffer.toString("base64")
    })

    saveStickerPacks()

    return reply(
`➕ Added to *${name}* pack ${emoji}

📦 Type: ${type}
📊 Total stickers: ${pack.stickers.length}`
    )

  } catch (err) {
    console.error("PACK ADD ERROR:", err)
    return reply("❌ Failed to add sticker")
  }
},

// VIEW PACKS

pack_view: async () => {
  if (!isOwner) return reply("❌ My owner only")
  const name = args[0]?.toLowerCase()

  if (!name)
    return reply("❌ Usage: .pack view <name>")

  const pack = STICKER_PACKS[name]

  if (!pack)
    return reply("❌ Pack not found")

  let text = `📦 *PACK: ${name}*\n\n`

  pack.stickers.forEach((s, i) => {
    text += `${i + 1}. ${s.emoji} ${s.type}\n`
  })

  reply(text)
},

// LIST PACKS

pack_list: async () => {
  if (!isOwner) return reply("❌ My owner only")
  const packs = Object.keys(STICKER_PACKS)

  if (!packs.length)
    return reply("❌ No packs available")

  let text = "📦 *STICKER PACKS*\n\n"

  packs.forEach(p => {
    text += `• ${p} (${STICKER_PACKS[p].stickers.length})\n`
  })

  reply(text)
},

// DELETE PACK

pack_delete: async () => {
  if (!isOwner) return reply("❌ My owner only")
  const name = args[0]?.toLowerCase()

  if (!name)
    return reply("❌ Usage: .pack delete <name>")

  if (!STICKER_PACKS[name])
    return reply("❌ Pack not found")

  delete STICKER_PACKS[name]
  saveStickerPacks()

  reply(`🗑️ Pack *${name}* deleted`)
},

// SEND PACK

pack_send: async () => {
  if (!isOwner) return reply("❌ My owner only")
  const name = args[0]?.toLowerCase()

  if (!name)
    return reply("❌ Usage: .pack send <name>")

  const pack = STICKER_PACKS[name]

  if (!pack || !pack.stickers.length)
    return reply("❌ Empty or missing pack")

  const random =
    pack.stickers[Math.floor(Math.random() * pack.stickers.length)]

  const buffer = Buffer.from(random.data, "base64")

  await sock.sendMessage(jid, {
    sticker: buffer,
    caption: random.emoji
  }, { quoted: msg })
},

      // ===== TOGGLES =====
      antidelete: async () => {
        if (!isOwner) return reply("❌ My owner only")
        group_settings.antidelete = args[0] === "on"
        saveGroupSettings()
        reply(`🧠 Anti-delete ${group_settings.antidelete ? "ON" : "OFF"}`)
      },

      antilink: async () => {
        if (!isOwner) return reply("❌ My owner only")
        group_settings.antilink = args[0] === "on"
        saveGroupSettings()
        reply(`🔗 Anti-link ${group_settings.antilink ? "ON" : "OFF"}`)
      },

      antibadword: async () => {
  if (!isOwner) return reply("❌ My owner only")

  group_settings.antibadword = args[0] === "on"
  saveGroupSettings()

  reply(`🧼 Anti-badword ${group_settings.antibadword ? "ON" : "OFF"}`)
},

  settings: async () => {
  if (!isOwner) {
    await react(sock, jid, msg.key, "error")
    return reply("❌ My owner only")
  }

  await react(sock, jid, msg.key, "loading")

  reply(
`⚙️ *SETTINGS PANEL*

🛡️ *Protection*
🧠 Anti-Delete: ${group_settings.antidelete ? "✅ ON" : "❌ OFF"}
🔗 Anti-Link: ${group_settings.antilink ? "✅ ON" : "❌ OFF"}
🧼 Anti-Badword: ${group_settings.antibadword ? "✅ ON" : "❌ OFF"}

👁️ *Status Protection*
🚫 Anti-Status: ${group_settings.antistatus ? "✅ ON" : "❌ OFF"}
📢 Anti-Status Mention: ${group_settings.antistatus_mention ? "✅ ON" : "❌ OFF"}

📥 *Status System*
💾 Auto Save Status: ${global.AUTO_SAVE_STATUS ? "✅ ON" : "❌ OFF"}
👥 Allowed Contacts: ${global.ALLOWED_STATUS_CONTACTS?.length || 0}
📚 Saved Status: ${global.STATUS_DB?.length || 0}

💬 *DM Auto Reply*
💬 Auto Reply: ${global.DM_AUTO_REPLY?.enabled ? "✅ ON" : "❌ OFF"}

🚷 *Ban System*
🚷 Banned Users: ${global.BANNED_USERS ? Object.keys(global.BANNED_USERS).length : 0}
🔒 Block Sync: ${global.BLOCK_SYNC ? "✅ ON" : "❌ OFF"}

🔐 *Bot Mode*
⚙️ Mode: ${String(settings.mode || "public").toUpperCase()}

👑 *Owner Controls*
👑 Owners: ${BOT_OWNERS.length}

📊 *System*
👥 Group: ${isGroup ? "✅ Group Chat" : "❌ Private Chat"}
👑 Your Role: ${isOwner ? "Bot Owner" : isAdmin ? "Group Admin" : "Member"}

⚡ *Runtime*
⏱️ Uptime: ${formatRuntime(process.uptime())}
📨 Messages: ${BOT_STATS.messages}

🗂️ *Database*
📚 Status DB: ${global.STATUS_DB?.length || 0}
🚷 Ban DB: ${global.BANNED_USERS ? Object.keys(global.BANNED_USERS).length : 0}
👥 Owners DB: ${BOT_OWNERS.length}

👋 *Welcome & Goodbye System*
👋 Welcome: ${group_settings.welcome ? "✅ ON" : "❌ OFF"}
🚪 Goodbye: ${group_settings.goodbye ? "✅ ON" : "❌ OFF"}
📝 Welcome Text: ${group_settings.welcomeText ? "✅ Custom" : "❌ Default"}
📝 Goodbye Text: ${group_settings.goodbyeText ? "✅ Custom" : "❌ Default"}
🖼️ Welcome Image: ${group_settings.welcomeImg ? "✅ Set" : "❌ None"}
🖼️ Goodbye Image: ${group_settings.goodbyeImg ? "✅ Set" : "❌ None"}
🎭 Welcome Style: ${String(group_settings.welcomestyle || "text").toUpperCase()}
🎭 Goodbye Style: ${String(group_settings.goodbyestyle || "text").toUpperCase()}
🎨 Welcome Color: ${group_settings.welcomecolor || "Default"}
🎨 Goodbye Color: ${group_settings.goodbyecolor || "Default"}
⏳ Welcome Delay: ${group_settings.welcomedelay || 0}s
📜 Rules Welcome: ${group_settings.ruleswelcome ? "✅ ON" : "❌ OFF"}

🤖 *Automation*
📍 Auto Role: ${group_settings.autorole ? "✅ ON" : "❌ OFF"}
👑 Auto Promote: ${group_settings.autopromote ? "✅ ON" : "❌ OFF"}
⬇️ Auto Demote: ${group_settings.autodemote ? "✅ ON" : "❌ OFF"}
🧹 Auto Clean Left Msg: ${group_settings.autoclean ? "✅ ON" : "❌ OFF"}
🎁 Auto Gift: ${group_settings.autogift ? "✅ ON" : "❌ OFF"}`
  )

  await react(sock, jid, msg.key, "success")
},

dashboard: async () => {
  if (!isOwner) return reply("❌ My owner only")

  try {
    const text = `
🖥️ *OWNER CONTROL DASHBOARD*

👑 *Owners*
• Total Owners: ${BOT_OWNERS.length}
• Primary: ${BOT_OWNERS[0] || "None"}

⚙️ *Bot Mode*
• Mode: ${(settings.mode || "public").toUpperCase()}

🛡️ *Protection System*
• Anti-Link: ${group_settings.antilink ? "ON" : "OFF"}
• Anti-Badword: ${group_settings.antibadword ? "ON" : "OFF"}
• Anti-Delete: ${group_settings.antidelete ? "ON" : "OFF"}

💬 *Auto Systems*
• DM Auto Reply: ${global.DM_AUTO_REPLY?.enabled ? "ON" : "OFF"}
• Auto Status Save: ${global.AUTO_SAVE_STATUS ? "ON" : "OFF"}

🚷 *Ban System*
• Banned Users: ${Object.keys(global.BANNED_USERS || {}).length}

📊 *Bot Stats*
• Messages: ${BOT_STATS?.messages || 0}
• Uptime: ${formatRuntime(process.uptime())}

⚡ *Quick Actions*
• ${PREFIX}autoreplyon / autoreplyoff
• ${PREFIX}antilink on / off
• ${PREFIX}ban @user
• ${PREFIX}unban @user
• ${PREFIX}restart
• ${PREFIX}broadcast

🧠 *System Status*
• Status DB: ${global.STATUS_DB?.length || 0}
• Owners DB: ${BOT_OWNERS.length}

━━━━━━━━━━━━━━━━━━
💎 Boss' Dashboard
    `

    await sock.sendMessage(
      jid,
      { text, mentions: [sender] },
      { quoted: msg }
    )

  } catch (e) {
    console.log("DASHBOARD ERROR:", e)
    reply("❌ Failed to load dashboard")
  }
},
     
      // ======== WARNING ==========

  // ================= WARN USER =================
    warn: async () => {
  if (!isGroup) return reply("❌ Group only")
  if (!isOwner) return reply("❌ My owner only")

  const target = getTarget()
  if (!target) return reply("❌ Mention user")

  const reason = args.slice(1).join(" ") || "No reason provided"

  if (!WARN_DB[jid]) WARN_DB[jid] = {}
  if (!WARN_DB[jid][target]) WARN_DB[jid][target] = []

  WARN_DB[jid][target].push({
    reason,
    by: sender,
    time: Date.now()
  })

  saveWarnDB()

  const count = WARN_DB[jid][target].length

  await reply(
`⚠️ *WARNING ISSUED*

👤 User: @${target.split("@")[0]}
⚠️ Warn: ${count}/3
📝 Reason: ${reason}`
  )

  // AUTO KICK SYSTEM
  if (count >= 3) {
    await sock.groupParticipantsUpdate(jid, [target], "remove")

    delete WARN_DB[jid][target]
    saveWarnDB()

    return reply("🚫 User removed after 3 warnings")
  }
},


warnlist: async () => {
  if (!isGroup) return reply("❌ Group only")
    if (!isOwner) return reply("❌ My owner only")

  try {
    // 🔥 Always load latest warns
    loadWarnDB()

    // 🔥 Current group warns
    const warns = global.WARN_DB?.[jid] || {}

    // 🚫 No warns
    if (
      !warns ||
      typeof warns !== "object" ||
      Object.keys(warns).length === 0
    ) {
      return reply("✅ No active warnings in this group.")
    }

    let text = `⚠️ *GROUP WARN LIST*\n\n`
    let mentions = []
    let index = 1

    // ✅ Object.entries instead of warns.forEach
    for (const [user, data] of Object.entries(warns)) {
      if (!user || !data) continue

      let count = 0
      let reasons = []

      // 🔥 New object format
      if (
        typeof data === "object" &&
        data !== null
      ) {
        count = Number(data.count) || 0

        if (Array.isArray(data.reasons)) {
          reasons = data.reasons
        }
      }

      // 🔥 Old number format
      else if (typeof data === "number") {
        count = data
      }

      // 🚫 Skip zero warns
      if (count < 1) continue

      text +=
        `${index}. @${user.split("@")[0]}\n` +
        `⚠️ Warns: ${count}/${WARN_LIMIT}\n` +
        `📝 Reasons: ${
          reasons.length
            ? reasons.join(", ")
            : "No reason"
        }\n\n`

      mentions.push(user)
      index++
    }

    // 🚫 No valid warns after filtering
    if (mentions.length === 0) {
      return reply("✅ No active warnings in this group.")
    }

    await sock.sendMessage(jid, {
      text,
      mentions
    })

  } catch (e) {
    console.log("❌ WARNLIST ERROR:", e)

    reply(
      `❌ Failed to fetch warn list.\n${e.message}`
    )
  }
},

// ================= CLEAR USER WARNINGS =================
unwarn: async () => {
  if (!isGroup) return reply("❌ Group only")
if (!isOwner) return reply("❌ My owner only")

  const target = getTarget()
  if (!target) return reply("❌ Mention user")

  if (!WARN_DB[jid] || !WARN_DB[jid][target])
    return reply("❌ No warnings found")

  delete WARN_DB[jid][target]
  saveWarnDB()

  reply(`✅ Warnings cleared for @${target.split("@")[0]}`)
},

warninfo: async () => {
  if (!isGroup) return reply("❌ Group only")
if (!isOwner) return reply("❌ My owner only")

  const target = getTarget() || sender

  const warns = WARN_DB[jid]?.[target] || []

  if (!warns.length)
    return reply("✅ No warnings for this user")

  let text = `⚠️ *WARN INFO*\n\n👤 @${target.split("@")[0]}\n\n`

  warns.forEach((w, i) => {
    text += `⚠️ ${i + 1}. ${w.reason}\n`
  })

  reply(text)
},

// ================= RESET WARNS =================
resetwarns: async () => {
  if (!isGroup) return reply("❌ Group only")
  if (!isOwner) return reply("❌ My owner only")

  await react("♻️")

  WARN_DB[jid] = {}
  saveWarnDB()

  reply("♻️ All group warnings cleared")
},


      viewadmins: async () => {
  if (!isGroup) return reply("❌ Group only")
    if (!isOwner) return reply("❌ My owner only")

  try {
    const meta = await sock.groupMetadata(jid)

    const admins = meta.participants
      .filter(p => p.admin)
      .map(p => p.id)

    if (!admins.length) {
      return reply("❌ No admins found")
    }

    const text =
      "👑 *Group Admins*\n\n" +
      admins.map((a, i) => ` ${i + 1}. @${a.split("@")[0]}`).join("\n")

    await sock.sendMessage(jid, {
      text,
      mentions: admins
    })

  } catch (e) {
    console.log(e)
    reply("❌ Failed to fetch admins (bot may not be admin)")
  }
},

    
 // ================= ADD OWNER =================
 // 👑 ADD OWNER BY NUMBER (no @mentions)
// 👑 ADD OWNER (number, mention, or reply) — FULL FIX
addowner: async () => {
  if (!isOwner) return reply("❌  Bot Owner only")

  try {
    let jid = null
    let number = null

    const mentioned =
      msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

    const quoted =
      msg.message?.extendedTextMessage?.contextInfo?.participant

    // 1️⃣ Mention
    if (mentioned) {
      jid = mentioned
      number = jid.split("@")[0]
    }

    // 2️⃣ Reply
    else if (quoted) {
      jid = quoted
      number = jid.split("@")[0]
    }

    // 3️⃣ Manual number
    else if (args[0]) {
      number = args[0].replace(/\D/g, "")

      // 🇳🇬 Local fix
      if (number.startsWith("0")) {
        number = "234" + number.slice(1)
      }

      if (number.length < 10) {
        return reply("❌ Invalid number format")
      }

      // 🌍 Real WhatsApp validation
      const check = await sock.onWhatsApp(number)

      if (!check || !check[0]?.jid) {
        return reply(`❌ Number is not on WhatsApp:\n${number}`)
      }

      // ✅ ALWAYS use official WhatsApp JID
      jid = check[0].jid
      number = jid.split("@")[0]
    }

    if (!jid || !number) {
      return reply(
`❌ Usage:
${PREFIX}addowner 2348012345678
${PREFIX}addowner @user
Reply to a user`
      )
    }

    // 🔥 Normalize JID
    jid = jid.includes("@s.whatsapp.net")
      ? jid
      : `${number}@s.whatsapp.net`

    // ✅ Prevent duplicates
    if (BOT_OWNERS.some(owner => normalizeJid(owner) === normalizeJid(jid))) {
      return reply(`⚠️ ${number} is already an owner`)
    }

    // 👑 Save
    BOT_OWNERS.push(jid)

    // 🔥 CRITICAL FIX: runtime + persistent
    global.BOT_OWNERS = [...BOT_OWNERS]

    saveOwners()

    reply(
`👑 Owner added successfully

📱 Number: ${number}
🆔 Access granted instantly`
    )

  } catch (e) {
    console.log("AddOwner Error:", e)
    reply("❌ Failed to add owner")
  }
},

// ❌ REMOVE OWNER (number, mention, or reply) — FULL FIX
delowner: async () => {
  if (!isOwner) return reply("❌ My owner only")

  try {
    let jid = null
    let number = null

    const mentioned =
      msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

    const quoted =
      msg.message?.extendedTextMessage?.contextInfo?.participant

    // 1️⃣ Mention
    if (mentioned) {
      jid = mentioned
      number = jid.split("@")[0]
    }

    // 2️⃣ Reply
    else if (quoted) {
      jid = quoted
      number = jid.split("@")[0]
    }

    // 3️⃣ Manual number
    else if (args[0]) {
      number = args[0].replace(/\D/g, "")

      if (number.startsWith("0")) {
        number = "234" + number.slice(1)
      }

      if (number.length < 10) {
        return reply("❌ Invalid number format")
      }

      jid = `${number}@s.whatsapp.net`
    }

    if (!jid || !number) {
      return reply(
`❌ Usage:
${PREFIX}delowner 2348012345678
${PREFIX}delowner @user
Reply to a user`
      )
    }

    jid = jid.includes("@s.whatsapp.net")
      ? jid
      : `${number}@s.whatsapp.net`

    // ❌ Check owner
    if (!BOT_OWNERS.some(owner => normalizeJid(owner) === normalizeJid(jid))) {
      return reply(`⚠️ ${number} is not in owner list`)
    }

    // 🗑️ Remove
    BOT_OWNERS = BOT_OWNERS.filter(
      owner => normalizeJid(owner) !== normalizeJid(jid)
    )

    // 🔥 Runtime update
    global.BOT_OWNERS = [...BOT_OWNERS]

    saveOwners()

    reply(
`👑 Owner removed successfully

📱 Number: ${number}
🗑️ Access revoked instantly`
    )

  } catch (e) {
    console.log("DelOwner Error:", e)
    reply("❌ Failed to remove owner")
  }
},

// 📋 LIST OWNERS BY NUMBER ONLY
owners: async () => {
   if (!isOwner) return reply("❌ My owner only")
 reply(
    "👑 Owners:\n" +
    BOT_OWNERS.map((o, i) => `${i + 1}. ${o.split("@")[0]}`).join("\n")
  )
   if (!BOT_OWNERS.length) {
    return reply("❌ No owners found")
   }
},

// ====== AUTO REPLY=======

autoreplyon: async () => {
  if (!isOwner) return reply("❌ My owner only")

  global.DM_AUTO_REPLY.enabled = true
  reply("💬 Auto Reply Enabled ✅")
},

autoreplyoff: async () => {
  if (!isOwner) return reply("❌ My owner only")

  global.DM_AUTO_REPLY.enabled = false
  reply("🔕 Auto Reply Disabled ❌")
},


addreply: async () => {
  if (!isOwner) return reply("❌ My owner only")

  const [keyword, ...msgParts] = args
  const message = msgParts.join(" ")

  if (!keyword || !message) {
    return reply("❌ Usage: .addreply hello Hi there 👋")
  }

  if (!global.DM_AUTO_REPLY.words[keyword]) {
    global.DM_AUTO_REPLY.words[keyword] = []
  }

  global.DM_AUTO_REPLY.words[keyword].push(message)

  return reply(`✅ Added reply for "${keyword}"`)
},

delreply: async () => {
  if (!isOwner) return reply("❌ My owner only")

  const keyword = args[0]

  if (!keyword) return reply("❌ Usage: .delreply hello")

  delete global.DM_AUTO_REPLY.words[keyword]

  return reply(`🗑️ Deleted replies for "${keyword}"`)
},

listreply: async () => {
  if (!isOwner) return reply("❌ My owner only")

  let text = "💬 *AUTO REPLY LIST*\n\n"

  for (const key in global.DM_AUTO_REPLY.words) {
    text += `🔹 ${key}:\n`

    global.DM_AUTO_REPLY.words[key].forEach((r, i) => {
      text += `   ${i + 1}. ${r}\n`
    })

    text += "\n"
  }

  reply(text)
},

   restart: async () => {
  if (!isOwner) return reply("❌ My owner only")

  await reply("🔄 Restarting bot safely...")

  try {
    // optional: log restart event or save state
    console.log("🔄 Bot restart requested by owner")

    // small delay to ensure message is sent
    setTimeout(() => {
      // clean exit so Render restarts container properly
      process.exit(0)
    }, 1500)

  } catch (e) {
    console.log("Restart error:", e)
    reply("❌ Restart failed")
  }
},

restart_force: async () => {
  if (!isOwner) return reply("❌ My owner only")

  await reply("🔄 Restarting bot safely...")

  setTimeout(() => {
    // intentional crash → Render auto-redeploys container
    throw new Error("BOT_RESTART_TRIGGER")
  }, 1500)
},

shutdown: async () => {
  if (!isOwner) return reply("❌ My owner only")

  try {
    await reply("⛔ Shutting down bot safely...")

    console.log("⛔ Shutdown triggered by owner")

    // small delay to ensure message delivery
    setTimeout(() => {
      // clean exit signal for Render
      process.exit(0)
    }, 1500)

  } catch (e) {
    console.log("Shutdown error:", e)
    process.exit(1)
  }
},

shutdown_force: async () => {
  if (!isOwner) return reply("❌ My owner only")

  await reply("⛔ Bot shutting down...")

  setTimeout(() => {
    throw new Error("BOT_SHUTDOWN_TRIGGER")
  }, 1500)
},

broadcast: async () => {
  if (!isOwner) return reply("❌ My owner only")

  const message = args.join(" ")
  if (!message) return reply("❌ Provide message")

  try {
    const allChats = Object.keys(sock.store?.chats || MSG_STORE)

    let success = 0

    for (const chat of allChats) {
      try {
        await sock.sendMessage(chat, {
          text: `📢 OWNER BROADCAST\n\n${message}`
        })

        success++

        await new Promise(r => setTimeout(r, 800))
      } catch {}
    }

    reply(`✅ Broadcast sent to ${success} chats`)
  } catch (e) {
    console.log(e)
    reply("❌ Broadcast failed")
  }
},

// ================= BAN USER =================
ban: async () => {
  if (!isOwner) {
    await react(sock, jid, msg.key, "error")
    return reply("❌ My owner only")
  }

  await react(sock, jid, msg.key, "loading")

  let number =
    args[0]?.replace(/\D/g, "") ||
    msg.message?.extendedTextMessage?.contextInfo?.participant?.split("@")[0]

  if (!number) {
    await react(sock, jid, msg.key, "error")
    return reply("❌ Usage: !ban 2348012345678 or reply to a user")
  }

  // 🇳🇬 Auto-fix Nigerian local format
  if (number.startsWith("0")) {
    number = "234" + number.slice(1)
  }

  const target = number + "@s.whatsapp.net"

  if (!global.BANNED_USERS) global.BANNED_USERS = {}

  if (global.BANNED_USERS[target]) {
    await react(sock, jid, msg.key, "warn")
    return reply(`⚠️ ${number} is already banned`)
  }

  global.BANNED_USERS[target] = {
    bannedBy: sender,
    time: Date.now()
  }

  // 🚫 Block in DM
  try {
    await sock.updateBlockStatus(target, "block")
  } catch (e) {
    console.log("Block sync error:", e)
  }

  await react(sock, jid, msg.key, "ban")

  reply(`🚷 Blocked & banned ${number} from using the bot`)
},

unban: async () => {
  if (!isOwner) {
    await react(sock, jid, msg.key, "error")
    return reply("❌ My owner only")
  }

  await react(sock, jid, msg.key, "loading")

  let number =
    args[0]?.replace(/\D/g, "") ||
    msg.message?.extendedTextMessage?.contextInfo?.participant?.split("@")[0]

  if (!number) {
    await react(sock, jid, msg.key, "error")
    return reply("❌ Usage: .unban 2348012345678 or reply to a user")
  }

  // 🇳🇬 Auto-fix Nigerian local format
  if (number.startsWith("0")) {
    number = "234" + number.slice(1)
  }

  const target = number + "@s.whatsapp.net"

  if (!global.BANNED_USERS || !global.BANNED_USERS[target]) {
    await react(sock, jid, msg.key, "warn")
    return reply(`⚠️ ${number} is not banned`)
  }

  delete global.BANNED_USERS[target]

  // ✅ Unblock in DM
  try {
    await sock.updateBlockStatus(target, "unblock")
  } catch (e) {
    console.log("Unblock sync error:", e)
  }

  await react(sock, jid, msg.key, "success")

  reply(`✅ Unblocked & unbanned ${number}`)
},

banned: async () => {
  if (!isOwner) {
    await react(sock, jid, msg.key, "error")
    return reply("❌ My owner only")
  }

  await react(sock, jid, msg.key, "loading")

  const banned = global.BANNED_USERS || {}
  const users = Object.keys(banned)

  if (!users.length) {
    await react(sock, jid, msg.key, "info")
    return reply("📭 No banned users")
  }

  let text = "🚷 *BANNED USERS LIST*\n\n"

  users.forEach((user, i) => {
    text += `${i + 1}. @${user.split("@")[0]}\n`
  })

  await react(sock, jid, msg.key, "success")

  return sock.sendMessage(jid, {
    text,
    mentions: users
  })
},

// ================= MUTE USER =================
mute: async () => {
  if (!isGroup) return reply("❌ Group only")
  if (!isOwner) return reply("❌ My owner only")

  await react("🔇")

  const target = normalizeJid(getTarget())
  if (!target) return reply("❌ Mention user")

  if (!MUTED_USERS[jid]) MUTED_USERS[jid] = []

  let MUTED_USERS = MUTED_USERS || {}

  if (MUTED_USERS[jid].includes(target)) {
    return reply("❌ User already muted")
  }

  MUTED_USERS[jid].push(target)

  reply(`🔇 @${target.split("@")[0]} has been muted`, {
    mentions: [target]
  })
},

// ================= UNMUTE USER =================
unmute: async () => {
  if (!isGroup) return reply("❌ Group only")
  if (!isOwner) return reply("❌ My owner only")

  await react("🔊")

  const target = normalizeJid(getTarget())
  if (!target) return reply("❌ Mention user")

  if (!MUTED_USERS[jid] || !MUTED_USERS[jid].includes(target)) {
    return reply("❌ User is not muted")
  }

  MUTED_USERS[jid] = MUTED_USERS[jid].filter(u => u !== target)

  reply(`🔊 @${target.split("@")[0]} has been unmuted`, {
    mentions: [target]
  })
},

// ================= MUTE LIST =================
mutelist: async () => {
  if (!isGroup) return reply("❌ Group only")

  await react("📋")

  const muted = MUTED_USERS[jid] || []

  if (!muted.length) {
    return reply("📭 No muted users")
  }

  const text =
`🔇 *MUTED USERS LIST*

${muted.map((u, i) => `${i + 1}. @${u.split("@")[0]}`).join("\n")}`

  await sock.sendMessage(jid, {
    text,
    mentions: muted
  })
},

// ================= DELETE ALL LINKS =================
clearlinks: async () => {
  if (!isGroup) return reply("❌ Group only")
  if (!isOwner) return reply("❌ My owner only")

  await react("🧹")

  group_settings.antilink = true
  saveGroupSettings()

  reply("🧹 Anti-link reinforced. New links will be auto-deleted.")
},



      // ===== TAG =====
     tageveryone: async () => {
  if (!isGroup) return reply("❌ Group only")
  if (!isOwner) return reply("❌ My owner only")

  try {
    const meta = await sock.groupMetadata(jid)

    const members = meta.participants
      .map(p => p.id)
      .filter(Boolean)

    if (!members.length) return reply("❌ No members found")

    await reply(`📢 Tagging ${members.length} members...`)

    for (let i = 0; i < members.length; i++) {
      const user = members[i]

      await sock.sendMessage(jid, {
        text: `👋 Hi @${user.split("@")[0]}`,
        mentions: [user]
      })

      // 🔥 delay = anti-ban protection
      await new Promise(res => setTimeout(res, 1200))
    }

    reply("✅ Tagging completed")

  } catch (e) {
    console.log("Tagall Delay Error:", e)
    reply("❌ Failed to tag members")
  }
},

tagall: async () => {
  if (!isGroup) return reply("❌ Group only")
  if (!isOwner) return reply("❌ My owner only")

  try {
    const meta = await sock.groupMetadata(jid)

    const members = meta.participants
      .map(p => p.id)
      .filter(Boolean)

    if (!members.length) return reply("❌ No members found")

    const chunkSize = 20 // 🔥 safe limit per message
    const chunks = []

    for (let i = 0; i < members.length; i += chunkSize) {
      chunks.push(members.slice(i, i + chunkSize))
    }

    await reply(`📢 Tagging ${members.length} members in ${chunks.length} batches...`)

    for (let i = 0; i < chunks.length; i++) {
      const batch = chunks[i]

      const text =
        `📢 *Tag Batch ${i + 1}/${chunks.length}*\n\n` +
        batch.map(u => `👤 @${u.split("@")[0]}`).join("\n")

      await sock.sendMessage(jid, {
        text,
        mentions: batch
      })

      // 🔥 delay between batches
      await new Promise(res => setTimeout(res, 2500))
    }

    reply("✅ All members tagged safely")

  } catch (e) {
    console.log("Paginated Tagall Error:", e)
    reply("❌ Failed to execute paginated tag")
  }
},
tagonline: async () => {
  if (!isGroup) return reply("❌ Group only")
  if (!isOwner) return reply("❌ My owner only")

  try {
    const meta = await sock.groupMetadata(jid)

    const members = meta.participants
      .map(p => p.id)
      .filter(Boolean)

    if (!members.length) return reply("❌ No members found")

    // 🟡 Active users tracker (simple in-memory fallback)
    const activeUsers = members.filter(u => {
      // If bot has seen them recently in chat memory
      const lastMsg = MSG_STORE?.[u]
      return lastMsg ? true : false
    })

    // 🔥 fallback if no tracked active users
    const targets = activeUsers.length > 0 ? activeUsers : members.slice(0, 30)

    await reply(`📢 Tagging ${targets.length} active users...`)

    const text =
      `📢 *Active Members Ping*\n\n` +
      targets.map(u => `🟢 @${u.split("@")[0]}`).join("\n")

    await sock.sendMessage(jid, {
      text,
      mentions: targets
    })

  } catch (e) {
    console.log("tagonline error:", e)
    reply("❌ Failed to fetch active users")
  }
},
    hidetag: async () => {
  if (!isGroup) return reply("❌ Group only")
  if (!isOwner) return reply("❌ My owner only")

  try {
    const meta = await sock.groupMetadata(jid)

    const members = meta.participants
      .map(p => p.id)
      .filter(Boolean)

    if (!members.length) return reply("❌ No members found")

    const text = args.length > 0
      ? args.join(" ")
      : "📢 Announcement"

    // 📤 send hidetag message
    await sock.sendMessage(jid, {
      text,
      mentions: members
    })

    // ⏱️ delete command after 3 seconds
    setTimeout(async () => {
      try {
        await sock.sendMessage(jid, {
          delete: msg.key
        })
      } catch (e) {
        console.log("Command auto-delete failed:", e)
      }
    }, 3000)

  } catch (e) {
    console.log("Hidetag Error:", e)
    reply("❌ Failed to send hidden tag")
  }
},

      lock: async () => {
  if (!isGroup) return reply("❌ Group only")
  if (!isOwner) return reply("❌ My owner only")

  try {
    await sock.groupSettingUpdate(jid, "announcement")
    reply("🔒 Group locked (admins only)")
  } catch {
    reply("❌ Failed to lock group")
  }
},

// ================= 👑 ADMIN VIEW COMMANDS =================

// 👮 VIEW GROUP ADMINS
admins: async () => {
  if (!isOwner) return reply("❌ My owner only")
  if (!isGroup) {
    return reply("❌ Group only")
  }

  try {

    const metadata =
      await sock.groupMetadata(jid)

    const admins =
      metadata.participants.filter(
        p => p.admin
      )

    if (!admins.length) {
      return reply(
        "❌ No admins found"
      )
    }

    let text =
`👑 *GROUP ADMINS LIST*\n
🏷️ Group: ${metadata.subject}
👥 Total Admins: ${admins.length}\n`

    let mentions = []

    admins.forEach((admin, i) => {
      const user =
        admin.id.split("@")[0]

      const role =
        admin.admin === "superadmin"
          ? "👑 Owner"
          : "🛡️ Admin"

      text +=
`${i + 1}. ${role} @${user}\n`

      mentions.push(admin.id)
    })

    await sock.sendMessage(jid, {
      text,
      mentions
    })

  } catch (e) {
    console.log(
      "ADMINS VIEW ERROR:",
      e
    )

    reply(
      "❌ Failed to fetch admins"
    )
  }
},


// 🟢 VIEW ONLINE ADMINS (recently active approximation)
adminsonline: async () => {
  if (!isOwner) return reply("❌ My owner only")
  if (!isGroup) {
    return reply("❌ Group only")
  }

  try {

    const metadata =
      await sock.groupMetadata(jid)

    const admins =
      metadata.participants.filter(
        p => p.admin
      )

    if (!admins.length) {
      return reply(
        "❌ No admins found"
      )
    }

    let text =
`🟢 *ONLINE ADMINS (Estimated)*\n
🏷️ Group: ${metadata.subject}\n`

    let mentions = []

    admins.forEach((admin, i) => {
      const user =
        admin.id.split("@")[0]

      text +=
`${i + 1}. 👮 @${user}\n`

      mentions.push(admin.id)
    })

    await sock.sendMessage(jid, {
      text,
      mentions
    })

  } catch (e) {
    console.log(
      "ADMINS ONLINE ERROR:",
      e
    )

    reply(
      "❌ Failed to fetch online admins"
    )
  }
},


// 📊 ADMIN STATS
adminstats: async () => {
  if (!isOwner) return reply("❌ My owner only")
  if (!isGroup) {
    return reply("❌ Group only")
  }

  try {

    const metadata =
      await sock.groupMetadata(jid)

    const admins =
      metadata.participants.filter(
        p => p.admin
      )

    const owner =
      admins.find(
        p =>
          p.admin === "superadmin"
      )

    const normalAdmins =
      admins.filter(
        p =>
          p.admin !== "superadmin"
      )

    const members =
      metadata.participants.length

    let text =
`📊 *GROUP ADMIN ANALYTICS*

🏷️ Group: ${metadata.subject}
👥 Members: ${members}
👑 Owner: ${
  owner
    ? `@${owner.id.split("@")[0]}`
    : "Unknown"
}
🛡️ Total Admins: ${admins.length}
👮 Normal Admins: ${normalAdmins.length}
👤 Members: ${
  members - admins.length
}\n`

    let mentions = owner
      ? [owner.id]
      : []

    await sock.sendMessage(jid, {
      text,
      mentions
    })

  } catch (e) {
    console.log(
      "ADMIN STATS ERROR:",
      e
    )

    reply(
      "❌ Failed to fetch admin stats"
    )
  }
},

unlock: async () => {
  if (!isGroup) return reply("❌ Group only")
  if (!isOwner) return reply("❌ My owner only")

  try {
    await sock.groupSettingUpdate(jid, "not_announcement")
    reply("🔓 Group unlocked (everyone can chat)")
  } catch {
    reply("❌ Failed to unlock group")
  }
},

// ================= GROUP OPEN TEMP =================
opentemp: async () => {
  if (!isGroup) return reply("❌ Group only")
  if (!isOwner) return reply("❌ My owner only")

  const minutes = parseInt(args[0])
  if (!minutes || minutes < 1) {
    return reply("❌ Usage: .opentemp <minutes>")
  }

  await react("🔓")

  await sock.groupSettingUpdate(jid, "not_announcement")

  reply(`🔓 Group opened for ${minutes} minute(s)`)

  setTimeout(async () => {
    try {
      await sock.groupSettingUpdate(jid, "announcement")
      reply("🔒 Group auto-locked again")
    } catch (e) {
      console.log("TEMP LOCK ERROR:", e)
    }
  }, minutes * 60000)
},

// ================= GROUP CLOSE TEMP =================
closetemp: async () => {
  if (!isGroup) return reply("❌ Group only")
  if (!isOwner) return reply("❌ My owner only")

  const minutes = parseInt(args[0])
  if (!minutes || minutes < 1) {
    return reply("❌ Usage: .closetemp <minutes>")
  }

  await react("🔒")

  await sock.groupSettingUpdate(jid, "announcement")

  reply(`🔒 Group locked for ${minutes} minute(s)`)

  setTimeout(async () => {
    try {
      await sock.groupSettingUpdate(jid, "not_announcement")
      reply("🔓 Group auto-opened again")
    } catch (e) {
      console.log("TEMP OPEN ERROR:", e)
    }
  }, minutes * 60000)
},

// ===== SET OPEN TIME =====
setopen: async () => {
  if (!isGroup) return reply("❌ Group only")
  if (!isOwner) return reply("❌ My owner only")

  const time = args[0]

  // Format HH:MM (24hr)
  if (!/^\d{2}:\d{2}$/.test(time)) {
    return reply("❌ Usage: .setopen 06:00")
  }

  await react("🌅")

  if (!GROUP_SCHEDULES[jid]) GROUP_SCHEDULES[jid] = {}

  GROUP_SCHEDULES[jid].open = time
  GROUP_SCHEDULES[jid].enabled = true

  saveGroupSchedules()

  reply(
`🌅 *GROUP AUTO-OPEN SET*

🔓 Open Time: ${time}
🕒 Timezone: Africa/Lagos`
  )
},

// ===== SET CLOSE TIME =====
setclose: async () => {
  if (!isGroup) return reply("❌ Group only")
  if (!isOwner) return reply("❌ My owner only")

  const time = args[0]

  if (!/^\d{2}:\d{2}$/.test(time)) {
    return reply("❌ Usage: .setclose 22:00")
  }

  await react("🌑")

  if (!GROUP_SCHEDULES[jid]) GROUP_SCHEDULES[jid] = {}

  GROUP_SCHEDULES[jid].close = time
  GROUP_SCHEDULES[jid].enabled = true

  saveGroupSchedules()

  reply(
`🌙 *GROUP AUTO-CLOSE SET*

🔒 Close Time: ${time}
🕒 Timezone: Africa/Lagos`
  )
},

// ===== VIEW SCHEDULE =====
schedule: async () => {
  if (!isGroup) return reply("❌ Group only")

  await react("📅")

  const schedule = GROUP_SCHEDULES[jid]

  if (!schedule || (!schedule.open && !schedule.close)) {
    return reply("❌ No schedule set for this group")
  }

  reply(
`📅 *GROUP SCHEDULE SETTINGS*

🌅 Open: ${schedule.open || "Not set"}
🌙 Close: ${schedule.close || "Not set"}

⚙️ Status: ${schedule.enabled ? "✅ Active" : "❌ Disabled"}
🕒 Timezone: Africa/Lagos`
  )
},

// ===== DISABLE SCHEDULE =====
scheduleoff: async () => {
  if (!isGroup) return reply("❌ Group only")
  if (!isOwner) return reply("❌ My owner only")

  await react("⛔")

  if (!GROUP_SCHEDULES[jid]) {
    return reply("❌ No schedule found")
  }

  GROUP_SCHEDULES[jid].enabled = false
  saveGroupSchedules()

  reply("⛔ Group schedule disabled")
},

// ===== ENABLE SCHEDULE =====
scheduleon: async () => {
  if (!isGroup) return reply("❌ Group only")
  if (!isOwner) return reply("❌ My owner only")

  await react("✅")

  if (!GROUP_SCHEDULES[jid]) {
    return reply("❌ No schedule found")
  }

  GROUP_SCHEDULES[jid].enabled = true
  saveGroupSchedules()

  reply("✅ Group schedule enabled")
},

// ===== DELETE SCHEDULE =====
delschedule: async () => {
  if (!isGroup) return reply("❌ Group only")
  if (!isOwner) return reply("❌ My owner only")

  await react("🗑️")

  delete GROUP_SCHEDULES[jid]
  saveGroupSchedules()

  reply("🗑️ Group schedule deleted")
},


// ==== GROUP MANAGEMENT =====
setname: async () => {
    if (!isGroup) return reply("❌ Group only")
    if (!isOwner) return reply("❌ My owner only")

    const newName = args.join(" ")
    if (!newName) return reply("❌ Provide new group name")

    try {
      await sock.groupUpdateSubject(jid, newName)
      reply("✏️ Group name updated successfully")
    } catch (e) {
      console.log("SETNAME ERROR:", e)
      reply("❌ Failed to update group name")
    }
  },

  setdesc: async () => {
    if (!isGroup) return reply("❌ Group only")
    if (!isOwner) return reply("❌ My owner only")

    const newDesc = args.join(" ")
    if (!newDesc) return reply("❌ Provide new description")

    try {
      await sock.groupUpdateDescription(jid, newDesc)
      reply("📝 Group description updated successfully")
    } catch (e) {
      console.log("SETDESC ERROR:", e)
      reply("❌ Failed to update group description")
    }
  },

groupinfo: async () => {
  if (!isGroup) return reply("❌ Group only")
    if (!isOwner) return reply("❌ My owner only")

  try {
    const meta = await sock.groupMetadata(jid)

    const admins = meta.participants
      .filter(p => p.admin)
      .map(p => p.id)

    const owner = meta.owner || "Unknown"

    const text =
`📛 ${meta.subject}

👥 Members: ${meta.participants.length}
👑 Owner: @${owner.split("@")[0]}
🛡️ Admins: ${admins.length}

📝 Description:
${meta.desc || "None"}

👑 Admin List:
${admins.map((a, i) => ` ${i + 1}. @${a.split("@")[0]}`).join("\n")}
`

    await sock.sendMessage(jid, {
      text,
      mentions: [owner, ...admins].filter(Boolean)
    })

  } catch (e) {
    console.log(e)
    reply("❌ Failed to fetch group info")
  }
},

grouplink: async () => {
  if (!isGroup) return reply("❌ Group only")
  if (!isOwner) return reply("❌ My owner only")

  try {
    const code = await sock.groupInviteCode(jid)

    if (!code || typeof code !== "string") {
      return reply("❌ Failed to get invite link. Make sure bot is admin.")
    }

    const link = `https://chat.whatsapp.com/${code}`

    await sock.sendMessage(jid, {
      text: `🔗 *Group Invite Link*\n\n${link}`
    })

  } catch (e) {
    console.log("grouplink error:", e)
    reply("❌ Could not fetch group invite link (bot may not be admin)")
  }
},

revoke: async () => {
  if (!isGroup) return reply("❌ Group only")
  if (!isOwner) return reply("❌ My owner only")
  await sock.groupRevokeInvite(jid)
  reply("🔄 Group link reset successful")
},

// ================= ADD USER =================
add: async () => {
  if (!isGroup) return reply("❌ Group only")
  if (!isOwner) {
    return reply("❌ My owner only")
  }

  let number = args[0]?.replace(/\D/g, "") // removes +, spaces, etc.

  if (!number) {
    return reply("❌ Usage: !add 2348012345678")
  }

  // 🇳🇬 Auto-fix Nigerian local format
  if (number.startsWith("0")) {
    number = "234" + number.slice(1)
  }

  const user = number + "@s.whatsapp.net"

  try {
    // 👥 Add user directly
    const result = await sock.groupParticipantsUpdate(
      jid,
      [user],
      "add"
    )

    // 📊 Optional group name
    const meta = await sock.groupMetadata(jid)
    const groupName = meta.subject || "WhatsApp Group"

    // ✅ Success message
    await sock.sendMessage(
      jid,
      {
        text:
`➕ *USER ADDED*

👤 User: @${number}
🏷️ Group: ${groupName}
👑 Added By: @${sender.split("@")[0]}
✅ Status: Successful`,
        mentions: [user, sender]
      },
      { quoted: msg }
    )

  } catch (e) {

    console.log("Add error:", e)

    // ❌ Fallback if privacy blocks direct add
    try {
      const code = await sock.groupInviteCode(jid)
      const link = `https://chat.whatsapp.com/${code}`

      await sock.sendMessage(
        user,
        {
          text:
`👋 *GROUP INVITATION*

🏷️ You couldn't be added directly due to privacy settings.

🔗 Join Here:
${link}

👑 Invited By: @${sender.split("@")[0]}`,
          mentions: [sender]
        }
      )

      await sock.sendMessage(
        jid,
        {
          text:
`⚠️ *DIRECT ADD FAILED — INVITE SENT*

👤 User: @${number}
👑 By: @${sender.split("@")[0]}
📩 Private invite link sent instead`,
          mentions: [user, sender]
        },
        { quoted: msg }
      )

    } catch {

      await sock.sendMessage(
        jid,
        {
          text:
`❌ *ADD FAILED*

👤 User: @${number}
👑 By: @${sender.split("@")[0]}
⚠️ Could not add or invite user`,
          mentions: [user, sender]
        },
        { quoted: msg }
      )
    }
  }
},

invite: async () => {
  if (!isGroup) return reply("❌ Group only")
  if (!isOwner) {
    return reply("❌ My owner only")
  }

  let number = args[0]?.replace(/\D/g, "") // remove spaces, +, symbols

  if (!number) {
    return reply("❌ Usage: !invite 2348012345678")
  }

  // 🇳🇬 Auto-fix Nigerian local format
  if (number.startsWith("0")) {
    number = "234" + number.slice(1)
  }

  const target = number + "@s.whatsapp.net"

  try {
    // 🔗 Get fresh group invite code
    const code = await sock.groupInviteCode(jid)
    const link = `https://chat.whatsapp.com/${code}`

    // 👥 Group metadata
    const meta = await sock.groupMetadata(jid)
    const groupName = meta.subject || "WhatsApp Group"

    // 📩 Send invite privately
    await sock.sendMessage(
      target,
      {
        text:
`👋 *GROUP INVITATION*

🏷️ Group: ${groupName}
👑 Invited By: @${sender.split("@")[0]}

🔗 Join Link:
${link}

⚡ POWERED BY BOSS`,
        mentions: [sender]
      }
    )

    // ✅ Confirm publicly
    await sock.sendMessage(
      jid,
      {
        text:
`🔗 *INVITE SENT*

📩 User: @${number}
🏷️ Group: ${groupName}
👑 By: @${sender.split("@")[0]}
✅ Status: Successful`,
        mentions: [target, sender]
      },
      { quoted: msg }
    )

  } catch (e) {

    console.log("Invite error:", e)

    await sock.sendMessage(
      jid,
      {
        text:
`❌ *INVITE FAILED*

📩 User: @${number}
👑 By: @${sender.split("@")[0]}
⚠️ Could not send invite link`,
        mentions: [target, sender]
      },
      { quoted: msg }
    )
  }
},

// ================= KICK USER =================
 kick: async () => {
  if (!isGroup) return reply("❌ Group only")
  if (!isOwner) return reply("❌ My owner only")

  let user

  // 🔥 1. REPLY SUPPORT
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant
  if (quoted) {
    user = quoted
  }

  // 🔥 2. MENTION SUPPORT (@tag)
  else if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
    user = msg.message.extendedTextMessage.contextInfo.mentionedJid[0]
  }

  // 🔥 3. NUMBER SUPPORT
  else if (args[0]) {
    let number = args[0].replace(/\D/g, "")

    // 🇳🇬 fix Nigeria format
    if (number.startsWith("0")) {
      number = "234" + number.slice(1)
    }

    user = number + "@s.whatsapp.net"
  }

  if (!user) {
    return reply("❌ Usage:\n• Reply user\n• Tag user\n• !kick 2348012345678")
  }

  try {
    await sock.groupParticipantsUpdate(
      jid,
      [user],
      "remove"
    )

    await sock.sendMessage(
      jid,
      {
        text: `
👢 *USER KICKED*

🚫 User: @${user.split("@")[0]}
👑 By: @${sender.split("@")[0]}
📛 Action: Removed Successfully
        `,
        mentions: [user, sender]
      },
      { quoted: msg }
    )

  } catch (e) {
    console.log("Kick error:", e)

    await sock.sendMessage(
      jid,
      {
        text: `
❌ *KICK FAILED*

🚫 User: @${user.split("@")[0]}
⚠️ Reason: Could not remove user, you are not an admin
👑 By: @${sender.split("@")[0]}
        `,
        mentions: [user, sender]
      },
      { quoted: msg }
    )
  }
},


// ================= PROMOTE USER =================

     promote: async () => {
  if (!isGroup) return reply("❌ Group only")
  if (!isOwner) {
    return reply("❌ My owner only")
  }

  const target = getTarget()

  if (!target) {
    return reply("❌ Reply to or mention a user")
  }

  try {
    await sock.groupParticipantsUpdate(
      jid,
      [target],
      "promote"
    )

    await sock.sendMessage(
      jid,
      {
        text:
`⬆️ *USER PROMOTED*

👤 User: @${target.split("@")[0]}
👮 New Role: Group Admin
👑 Promoted By: @${sender.split("@")[0]}
✅ Status: Successful`,
        mentions: [target, sender]
      },
      { quoted: msg }
    )

  } catch (e) {

    console.log("Promote error:", e)

    await sock.sendMessage(
      jid,
      {
        text:
`❌ *PROMOTION FAILED*

👤 User: @${target.split("@")[0]}
👑 Attempted By: @${sender.split("@")[0]}
⚠️ Could not promote user`,
        mentions: [target, sender]
      },
      { quoted: msg }
    )
  }
},

demote: async () => {
  if (!isGroup) return reply("❌ Group only")
  if (!isOwner) {
    return reply("❌ My owner only")
  }

  const target = getTarget()

  if (!target) {
    return reply("❌ Reply to or mention a user")
  }

  try {
    await sock.groupParticipantsUpdate(
      jid,
      [target],
      "demote"
    )

    await sock.sendMessage(
      jid,
      {
        text:
`⬇️ *USER DEMOTED*

👤 User: @${target.split("@")[0]}
👮 Role Removed: Admin
👑 Demoted By: @${sender.split("@")[0]}
✅ Status: Successful`,
        mentions: [target, sender]
      },
      { quoted: msg }
    )

  } catch (e) {

    console.log("Demote error:", e)

    await sock.sendMessage(
      jid,
      {
        text:
`❌ *DEMOTION FAILED*

👤 User: @${target.split("@")[0]}
👑 Attempted By: @${sender.split("@")[0]}
⚠️ Could not demote user`,
        mentions: [target, sender]
      },
      { quoted: msg }
    )
  }
},



// promote: async () => {
//   if (!isGroup) return reply("❌ Group only")
//   if (!isOwner) return reply("❌ My owner only")

//   // supports mention, reply, or raw number
//   let number =
//     getTarget()?.split("@")[0] ||
//     args[0]?.replace(/\D/g, "")

//   if (!number) {
//     return reply("❌ Usage: .promote @user | reply | 2348012345678")
//   }

//   // Auto-fix Nigerian local format
//   if (number.startsWith("0")) {
//     number = "234" + number.slice(1)
//   }

//   const target = normalizeJid(number + "@s.whatsapp.net")

//   if (!target) return reply("❌ Invalid user")

//   try {
//     await sock.groupParticipantsUpdate(jid, [target], "promote")

//     reply(`👮 @${number} is now an admin`, {
//       mentions: [target]
//     })
//   } catch (e) {
//     console.log("Promote error:", e)

//     reply(`❌ Failed to promote @${number}`, {
//       mentions: [target]
//     })
//   }
// },

// // ================= DEMOTE USER =================
// demote: async () => {
//   if (!isGroup) return reply("❌ Group only")
//   if (!isOwner) return reply("❌ My owner only")

//   // supports mention, reply, or raw number
//   let number =
//     getTarget()?.split("@")[0] ||
//     args[0]?.replace(/\D/g, "")

//   if (!number) {
//     return reply("❌ Usage: .demote @user | reply | 2348012345678")
//   }

//   // Auto-fix Nigerian local format
//   if (number.startsWith("0")) {
//     number = "234" + number.slice(1)
//   }

//   const target = normalizeJid(number + "@s.whatsapp.net")

//   if (!target) return reply("❌ Invalid user")

//   try {
//     await sock.groupParticipantsUpdate(jid, [target], "demote")

//     reply(`⬇️ @${number} removed as admin`, {
//       mentions: [target]
//     })
//   } catch (e) {
//     console.log("Demote error:", e)

//     reply(`❌ Failed to demote @${number}`, {
//       mentions: [target]
//     })
//   }
// },

approve: async () => {
  if (!isGroup) {
    await react(sock, jid, msg.key, "❌")
    return reply("❌ Group only")
  }

  if (!isOwner) {
    await react(sock, jid, msg.key, "🚫")
    return reply("❌ My owner only")
  }

  let target =
    msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
    msg.message?.extendedTextMessage?.contextInfo?.participant ||
    args[0]

  if (!target) {
    await react(sock, jid, msg.key, "❓")
    return reply("❌ Mention, reply, or type a number")
  }

  target = String(target).replace(/\D/g, "")

  if (target.startsWith("0")) {
    target = "234" + target.slice(1)
  }

  if (target.length < 10) {
    await react(sock, jid, msg.key, "⚠️")
    return reply("❌ Invalid number")
  }

  target = normalizeJid(
    target.includes("@s.whatsapp.net")
      ? target
      : `${target}@s.whatsapp.net`
  )

  try {
    await sock.groupRequestParticipantsUpdate(jid, [target], "approve")

    // ✅ Success reaction options:
    // ✅ = approved
    // 🎉 = welcome
    // 👍 = accepted
    await react(sock, jid, msg.key, "✅")

    reply(`✅ Approved: ${target.split("@")[0]}`)

  } catch (err) {
    console.log("Approve error:", err.message)

    // ❌ Failure reaction options:
    // ❌ = failed
    // ⚠️ = issue
    // 🚫 = denied
    await react(sock, jid, msg.key, "❌")

    reply("❌ Failed (ensure join approval is ON or request exists)")
  }
},

reject: async () => {
  if (!isGroup) {
    await react(sock, jid, msg.key, "❌")
    return reply("❌ Group only")
  }

  if (!isOwner) {
    await react(sock, jid, msg.key, "🚫")
    return reply("❌ My owner only")
  }

  // ================= TARGET RESOLVER =================
  let target =
    // Mentioned user
    msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||

    // Quoted user
    msg.message?.extendedTextMessage?.contextInfo?.participant ||

    // Raw number from command
    args[0]

  if (!target) {
    await react(sock, jid, msg.key, "❓")
    return reply("❌ Mention, reply, or type a number")
  }

  // ================= NORMALIZE NUMBER =================
  target = String(target).replace(/\D/g, "")

  // Auto-convert local Nigerian format
  if (target.startsWith("0")) {
    target = "234" + target.slice(1)
  }

  // Validate basic number length
  if (target.length < 10) {
    await react(sock, jid, msg.key, "⚠️")
    return reply("❌ Invalid number")
  }

  // Convert to WhatsApp JID
  target = normalizeJid(
    target.includes("@s.whatsapp.net")
      ? target
      : `${target}@s.whatsapp.net`
  )

  try {
    await sock.groupRequestParticipantsUpdate(jid, [target], "reject")

    // ❌ Success reject reaction options:
    // ❌ = rejected
    // 🚫 = denied
    // ⛔ = blocked request
    await react(sock, jid, msg.key, "🚫")

    reply(`❌ Rejected: ${target.split("@")[0]}`)

  } catch (err) {
    console.log("Reject error:", err.message)

    // ⚠️ Failure reaction options:
    // ⚠️ = issue
    // ❌ = failed
    await react(sock, jid, msg.key, "⚠️")

    reply("❌ Failed (ensure join approval is ON or request exists)")
  }
},

approveall: async () => {
  if (!isGroup) return reply("❌ Group only")
  if (!isOwner) return reply("❌ My owner only")

  try {
    const requests = await sock.groupRequestParticipantsList(jid)

    if (!requests || requests.length === 0) {
      return reply("❌ No pending join requests")
    }

    const users = requests.map(u => u.jid)

    await sock.groupRequestParticipantsUpdate(jid, users, "approve")

    reply(`✅ Approved ${users.length} join request(s)`)
  } catch (e) {
    console.log(e)
    reply("❌ Failed to approve requests (maybe join approval is OFF)")
  }
},

rejectall: async () => {
  if (!isGroup) return reply("❌ Group only")
  if (!isOwner) return reply("❌ My owner only")

  try {
    const requests = await sock.groupRequestParticipantsList(jid)

    console.log("RAW REQUESTS:", requests)

    if (!requests || requests.length === 0) {
      return reply("❌ No pending join requests")
    }

    // 🔥 SAFE NORMALIZATION (handles ALL Baileys formats)
    const users = []

    for (const r of requests) {
      if (!r) continue

      let id = null

      if (typeof r === "string") {
        id = r
      } else {
        id = r.jid || r.participant || r.id || null
      }

      if (id) {
        const clean = normalizeJid(id)
        if (clean) users.push(clean)
      }
    }

    if (users.length === 0) {
      return reply("❌ No valid requests found")
    }

    // 🔥 REMOVE DUPLICATES (VERY IMPORTANT)
    const uniqueUsers = [...new Set(users)]

    // 🔥 SAFE UPDATE (try-catch per safety)
    try {
      await sock.groupRequestParticipantsUpdate(
        jid,
        uniqueUsers,
        "reject"
      )
    } catch (err) {
      console.log("Update error:", err)

      // fallback attempt (some Baileys versions require "decline")
      await sock.groupRequestParticipantsUpdate(
        jid,
        uniqueUsers,
        "decline"
      )
    }

    reply(`❌ Rejected ${uniqueUsers.length} join request(s)`)

  } catch (e) {
    console.log("RejectAll Fatal Error:", e)

    reply("❌ Failed (join approval may be OFF or unsupported)")
  }
},

requests: async () => {
  if (!isGroup) {
    await react(sock, jid, msg.key, "❌")
    return reply("❌ Group only")
  }

  if (!isOwner) {
    await react(sock, jid, msg.key, "🚫")
    return reply("❌ My owner only")
  }

  await react(sock, jid, msg.key, "⏳")

  try {
    const requests = await sock.groupRequestParticipantsList(jid)

    if (!requests || requests.length === 0) {
      await react(sock, jid, msg.key, "📭")
      return reply("❌ No pending join requests")
    }

    let text = `📨 *PENDING JOIN REQUESTS* (${requests.length})\n\n`

    requests.forEach((user, i) => {
      const number = user.jid.split("@")[0]

      text += `*${i + 1}.* wa.me/${number}\n`

      if (user.request_method) {
        text += `   🌐 Method: ${user.request_method}\n`
      }

      if (user.request_time) {
        const time = new Date(user.request_time * 1000).toLocaleString()
        text += `   🕒 Time: ${time}\n`
      }

      text += "\n"
    })

    text += `✅ Use ${prefix}approve <number>\n`
    text += `🚫 Use ${prefix}reject <number>\n`
    text += `🎉 Use ${prefix}approveall\n`
    text += `⛔ Use ${prefix}rejectall`

    await react(sock, jid, msg.key, "📨")

    reply(text)

  } catch (err) {
    console.log("Requests error:", err.message)

    await react(sock, jid, msg.key, "⚠️")

    reply("❌ Failed to fetch join requests (ensure join approval is ON)")
  }
},

// ================= ANTI STATUS =================
antistatus: async () => {
  if (!isGroup) return reply("❌ Group only")
  if (!isOwner) return reply("❌ My owner only")

  group_settings.antistatus = args[0] === "on"
  saveGroupSettings()

  reply(`🚫 Anti-status ${group_settings.antistatus ? "ON" : "OFF"}`)
},

antistatusmention: async () => {
  if (!isGroup) return reply("❌ Group only")
  if (!isOwner) return reply("❌ My owner only")

  group_settings.antistatus_mention = args[0] === "on"
  saveGroupSettings()

  reply(`📢 Anti-status mention ${group_settings.antistatus_mention ? "ON" : "OFF"}`)
},

del: async () => {
  if (!isOwner) return reply("❌ My owner only")

  const quoted = msg.message?.extendedTextMessage?.contextInfo

  if (!quoted?.stanzaId) {
    return reply(
`❌ Reply to a message to delete

🗑️ Command:
${PREFIX}del`
    )
  }

  try {
    // ✅ Universal delete for DM + Group
    const key = {
      remoteJid: jid,
      id: quoted.stanzaId,
      fromMe: quoted.participant ? false : true
    }

    // ✅ participant only needed in groups
    if (quoted.participant) {
      key.participant = quoted.participant
    }

    await sock.sendMessage(jid, { delete: key })

    reply("🗑️ Message deleted")

  } catch (e) {
    console.log("DELETE ERROR:", e)

    // 🔥 Fallback for bot/self messages in DM
    try {
      await sock.sendMessage(jid, {
        delete: {
          remoteJid: jid,
          id: quoted.stanzaId,
          fromMe: true
        }
      })

      reply("🗑️ Message deleted")

    } catch (err) {
      console.log("DELETE FALLBACK ERROR:", err)
      reply("❌ Failed to delete message (too old or restricted)")
    }
  }
},

delete: async () => {
  if (!isOwner) return reply("❌ My owner only")

  const quoted = msg.message?.extendedTextMessage?.contextInfo

  if (!quoted?.stanzaId) {
    return reply(
`❌ Reply to the message you want to delete

🗑️ Command:
${PREFIX}delete`
    )
  }

  try {
    // ✅ Works for both DM + Group
    const deletePayload = {
      remoteJid: jid,
      fromMe: quoted.participant ? false : true,
      id: quoted.stanzaId
    }

    // ✅ Add participant only for groups
    if (quoted.participant) {
      deletePayload.participant = quoted.participant
    }

    await sock.sendMessage(jid, {
      delete: deletePayload
    })

  } catch (e) {
    console.log("DELETE ERROR:", e)

    // 🔥 Fallback: try deleting bot's own message in DM
    try {
      await sock.sendMessage(jid, {
        delete: {
          remoteJid: jid,
          fromMe: true,
          id: quoted.stanzaId
        }
      })
    } catch (err) {
      console.log("DELETE FALLBACK ERROR:", err)
      return reply("❌ Cannot delete (message may be too old or not permitted)")
    }
  }
},

alive: async () => {
  if (!isOwner) return reply("❌ My owner only")

  const uptime = Date.now() - BOT_STATS.startTime
  const seconds = Math.floor(uptime / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  reply(`
🤖 BOSS' BOT STATS

⏱️ Uptime: ${hours}h ${minutes % 60}m ${seconds % 60}s
💬 Messages: ${BOT_STATS.messages}
⚡ Commands used: ${BOT_STATS.commands}

📊 Status: ACTIVE
`)
},

test: async () => {
  if (!isOwner) return reply("❌ My owner only")
  try {
    const res = await fetch("https://example.com")
    const text = await res.text()

    return reply("✅ Fetch working. Length: " + text.length)
  } catch (e) {
    return reply("❌ Fetch blocked: " + e.message)
  }
},

nettest: async () => {
  if (!isOwner) return reply("❌ My owner only")
  try {
    const res = await fetch("https://www.google.com")
    const text = await res.text()

    reply("✅ Internet OK")
  } catch (e) {
    reply("❌ No internet access from bot server")
  }
},

help: async () => {
  if (!isOwner) return reply("❌ My owner only")
  await react(sock, jid, msg.key, "📖")

  const text = `
📖 𝘾𝙊𝙈𝙈𝘼𝙉𝘿 𝙂𝙐𝙄𝘿𝙀

👤 𝙃𝙤𝙬 𝙩𝙤 𝙪𝙨𝙚 𝙗𝙤𝙩:
➤ Type commands with prefix: ${prefix}
➤ Example: ${prefix}menu

📌 𝙀𝙭𝙖𝙢𝙥𝙡𝙚𝙨:
➤ ${prefix}tagall
➤ ${prefix}kick @user
➤ ${prefix}approve
➤ ${prefix}rejectall

⚙️ 𝙏𝙞𝙥𝙨:
➤ Reply to messages for actions
➤ Mention users where needed
➤ Use numbers for some commands

🤖 𝘽𝙤𝙩 𝙨𝙪𝙥𝙥𝙤𝙧𝙩𝙨:
➤ Groups
➤ DMs
➤ Admin controls
➤ Auto systems

💡 𝙐𝙨𝙚 ${prefix}menu 𝙩𝙤 𝙨𝙚𝙚 𝙖𝙡𝙡 𝙘𝙤𝙢𝙢𝙖𝙣𝙙𝙨
`

  reply(text)
},

runtime: async () => {

  try {
    const uptime = process.uptime() // in seconds

    const days = Math.floor(uptime / 86400)
    const hours = Math.floor((uptime % 86400) / 3600)
    const minutes = Math.floor((uptime % 3600) / 60)
    const seconds = Math.floor(uptime % 60)

    const text = `
⏱️ 𝘽𝙊𝙏 𝙍𝙐𝙉𝙏𝙄𝙈𝙀

📆 Days: ${days}
⏰ Hours: ${hours}
⏳ Minutes: ${minutes}
⏱️ Seconds: ${seconds}

⚡ Status: Online
`

    reply(text)

  } catch (err) {
    console.log("Runtime error:", err.message)
    reply("❌ Failed to get runtime")
  }
},

mode: async () => {
  if (!isOwner) return reply("❌ My owner only")

  const current = settings.mode || "public"
  const newMode = args[0]?.toLowerCase()

  if (!newMode) {
    return reply(
`🔐 𝐁𝐎𝐓 𝐌𝐎𝐃𝐄 𝐂𝐎𝐍𝐓𝐑𝐎𝐋

🌍 *PUBLIC MODE*
➤ Everyone can use the bot
➤ Best for open groups & communities

🔒 *PRIVATE MODE*
➤ Only bot owner can use commands
➤ Maximum security mode

👥 *GROUP MODE*
➤ Works only in group chats
➤ Ignores all DMs

💬 *DM MODE*
➤ Works only in private chats
➤ Ignores all groups

⚡ *AUTO MODE*
➤ Smart switching system:
   • Groups → Public access
   • DMs → Owner-only access

━━━━━━━━━━━━━━━━━━━━
📊 Current Mode: *${current.toUpperCase()}*

Usage:
.mode public
.mode private
.mode group
.mode dm
.mode auto`
    )
  }

  const valid = ["public", "private", "group", "dm", "auto"]

  if (!valid.includes(newMode)) {
    return reply("❌ Invalid mode\nUse: public / private / group / dm / auto")
  }

  settings.mode = newMode
  saveSettings()

  reply(`✅ Bot mode changed to: *${newMode.toUpperCase()}*`)
},

whoami: async () => {
  reply(`👤 Your JID:\n${sender}`)
},

ping: async () => {
  if (!isOwner) return reply("❌ My owner only")
  const start = Date.now()

  const sent = await sock.sendMessage(jid, {
    text: "🏓 Pinging..."
  })

  const end = Date.now()
  const speed = end - start

  await sock.sendMessage(jid, {
    text:
`🏓 *PONG!. I AM ACTIVE TO ASSIST YOU*

⚡ Speed: ${speed}ms
🤖 Status: Online
📡 Server: Active`
  }, { quoted: msg })
},

// ============= STATUS FETCH =============
getstatus: async () => {
  if (!isOwner) return reply("❌ My owner only")

  try {
    const ctx =
      msg.message?.extendedTextMessage?.contextInfo ||
      msg.message?.imageMessage?.contextInfo ||
      msg.message?.videoMessage?.contextInfo ||
      {}

    const quoted = ctx.quotedMessage

    const arg = (args?.[0] || "").toLowerCase()

    // 🔥 DIRECT STATUS MODE (when message is status broadcast)
    const isDirectStatus = msg.key?.remoteJid === "status@broadcast"

    // 🔥 TARGET MESSAGE RESOLVER
    const target = isDirectStatus ? msg.message : quoted

    if (!target && arg !== "all") {
      return reply(
        "❌ Reply to a status OR use:\n!getstatus all"
      )
    }

    // =========================
    // 🔥 BULK MODE (future-ready hook)
    // =========================
    if (arg === "all") {
  const db = loadDB()

  if (!db.length) {
    return reply("📭 No saved statuses yet.")
  }

  let msg = `📚 *SAVED STATUSES*\n\n`

  db.slice(-20).reverse().forEach((s, i) => {
    msg += `#${i + 1}\n`
    msg += `Type: ${s.type}\n`
    msg += `Time: ${new Date(s.time).toLocaleString()}\n`
    if (s.text) msg += `Text: ${s.text}\n`
    msg += `──────────────\n`
  })

  return reply(msg)
}

    // =========================
    // TEXT STATUS
    // =========================
    const text =
      target?.conversation ||
      target?.extendedTextMessage?.text

    if (text) {
        logStatus(
      { type: "text", text: text },
      msg
    )
      return reply(`📥 STATUS TEXT:\n\n${text}`)
    }

    // =========================
    // IMAGE STATUS
    // =========================
    if (target?.imageMessage) {
      const stream = await downloadContentFromMessage(
        target.imageMessage,
        "image"
      )

      let buffer = Buffer.from([])
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk])
      }

        logStatus(
    { type: "image", media: "image_saved" },
    msg
  )

      return await sock.sendMessage(
        jid,
        {
          image: buffer,
          caption:
            target.imageMessage.caption ||
            "📥 Extracted status image"
        },
        { quoted: msg }
      )
    }

    // =========================
    // VIDEO STATUS
    // =========================
    if (target?.videoMessage) {
      const stream = await downloadContentFromMessage(
        target.videoMessage,
        "video"
      )

      let buffer = Buffer.from([])
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk])
      }

        logStatus(
  { type: "video", media: "video_saved" },
  msg
)

      return await sock.sendMessage(
        jid,
        {
          video: buffer,
          caption:
            target.videoMessage.caption ||
            "📥 Extracted status video"
        },
        { quoted: msg }
      )
    }

    return reply("❌ Status expired or unsupported type")

  } catch (e) {
    console.log("GETSTATUS ERROR:", e)

    return reply(
`❌ Failed to extract status

Reason: ${e.message || "Unknown error"}`
    )
  }
},

statuslist: async () => {
  if (!isOwner) return reply("❌ My owner only")

  const db = loadDB()

  if (!db.length) {
    return reply("📭 No saved statuses yet.")
  }

  let text = `📚 SAVED STATUSES:\n\n`

  db.slice(-10).reverse().forEach((s, i) => {
    text += `#${i + 1}\n`
    text += `Type: ${s.type}\n`
    text += `Time: ${new Date(s.time).toLocaleString()}\n`
    if (s.text) text += `Text: ${s.text}\n`
    text += `──────────────\n`
  })

  return reply(text)
},

autostatus: async () => {
   if (!isOwner) return reply("❌ My owner only")
  global.AUTO_SAVE_STATUS = !global.AUTO_SAVE_STATUS
  return reply(`⚙️ Auto Status Save: ${global.AUTO_SAVE_STATUS ? "ON" : "OFF"}`)
},

statusfilter: async () => {
  if (!isOwner) return reply("❌ My owner only")

  let number = args[0]?.replace(/\D/g, "")
  if (!number) return reply("❌ Usage: .statusfilter 23480xxxxxxx")

  if (number.startsWith("0")) {
    number = "234" + number.slice(1)
  }

  const jid = number + "@s.whatsapp.net"

  if (!global.ALLOWED_STATUS_CONTACTS) global.ALLOWED_STATUS_CONTACTS = []

  global.ALLOWED_STATUS_CONTACTS.push(jid)

  return reply(`👥 Added to allowed list: ${number}`)
},

clearstatus: async () => {
  if (!isOwner) return reply("❌ My owner only")
  saveDB([])
  return reply("✅ Status history cleared")
},

translate: async () => {
  if (!isOwner) return reply("❌ My owner only")
  try {
    let targetLang
    let text

    // 📩 Reply message support
    const quotedText =
      msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
      msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text

    if (quotedText) {
      const args = q.trim().split(" ")
      targetLang = args[0]?.toLowerCase()
      text = quotedText
    } else {
      const args = q.trim().split(" ")
      targetLang = args.shift()?.toLowerCase()
      text = args.join(" ")
    }

    if (!targetLang || !text) {
      return reply(
`🌍 *Translate Command*

Example:
${PREFIX}tr fr Hello world

Reply method:
Reply to a message and use:
${PREFIX}tr es`
      )
    }

    // 🌐 Expanded language aliases
const langMap = {
  // Major global languages
  english: "en", en: "en",
  french: "fr", fr: "fr",
  spanish: "es", es: "es",
  german: "de", de: "de",
  italian: "it", it: "it",
  portuguese: "pt", pt: "pt",
  russian: "ru", ru: "ru",
  arabic: "ar", ar: "ar",
  hindi: "hi", hi: "hi",
  chinese: "zh-cn", zh: "zh-cn", chinese: "zh-cn",
  japanese: "ja", ja: "ja",
  korean: "ko", ko: "ko",
  turkish: "tr", tr: "tr",
  dutch: "nl", nl: "nl",
  greek: "el", el: "el",
  polish: "pl", pl: "pl",
  swedish: "sv", sv: "sv",
  ukrainian: "uk", uk: "uk",
  hebrew: "iw", he: "iw", hebrew: "iw",
  persian: "fa", fa: "fa",
  thai: "th", th: "th",
  vietnamese: "vi", vi: "vi",
  indonesian: "id", id: "id",
  malay: "ms", ms: "ms",

  // African languages
  igbo: "ig", ig: "ig",
  yoruba: "yo", yo: "yo",
  hausa: "ha", ha: "ha",
  swahili: "sw", sw: "sw",
  zulu: "zu", zu: "zu",
  xhosa: "xh", xh: "xh",
  afrikaans: "af", af: "af",
  amharic: "am", am: "am",
  somali: "so", so: "so",

  // South Asian
  bengali: "bn", bn: "bn",
  urdu: "ur", ur: "ur",
  tamil: "ta", ta: "ta",
  telugu: "te", te: "te",
  gujarati: "gu", gu: "gu",
  punjabi: "pa", pa: "pa",
  marathi: "mr", mr: "mr",

  // European
  romanian: "ro", ro: "ro",
  czech: "cs", cs: "cs",
  danish: "da", da: "da",
  finnish: "fi", fi: "fi",
  hungarian: "hu", hu: "hu",
  norwegian: "no", no: "no",
  slovak: "sk", sk: "sk",

  // Extra
  filipino: "tl", tagalog: "tl", tl: "tl",
  latin: "la", la: "la",
  esperanto: "eo", eo: "eo"
}

    const lang = langMap[targetLang]

    if (!lang) {
      return reply("❌ Unsupported language code")
    }


    // ✅ WORKING ENDPOINT
   const res = await fetch(
  `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(text)}`
)

    const data = await res.json()

    if (!Array.isArray(data)) {
      return reply("❌ Translation failed")
    }

    const translated =
      data[0]
        ?.map(item => item[0])
        ?.join("")

    if (!translated) {
      return reply("❌ Translation failed")
    }

    reply(
`🌍 *Translation Result*

📝 Original:
${text}

🔤 Translated:
${translated}

🌐 Language:
${targetLang.toUpperCase()}

> 🔎 Powered by Smart Translate`
    )

  } catch (e) {
    console.log("TRANSLATE ERROR:", e)

    reply(
`❌ Translation failed

Possible causes:
• No internet
• Invalid language code
• Google blocked request`
    )
  }
},

detect: async () => {
  if (!isOwner) return reply("❌ My owner only")
  try {
    let text = q

    // 📩 Check replied message
    const quotedText =
      msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
      msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text

    if (quotedText) {
      text = quotedText
    }

    if (!text) {
      return reply(
`🧠 *Language Detect Command*

Usage:
${PREFIX}detect <text>

Example:
${PREFIX}detect Bonjour mon ami

Or reply to a message:
${PREFIX}detect`
      )
    }

    await react(sock, jid, msg.key, "🧠")

    // 🌍 Google detect
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`

    const res = await fetch(url)
    const data = await res.json()

    if (!data || !data[2]) {
      return reply("❌ Unable to detect language")
    }

    const langCode = data[2]

    // 🌐 Language names
    const languages = {
      af: "Afrikaans",
      ar: "Arabic",
      bg: "Bulgarian",
      bn: "Bengali",
      de: "German",
      el: "Greek",
      en: "English",
      es: "Spanish",
      fr: "French",
      ha: "Hausa",
      hi: "Hindi",
      ig: "Igbo",
      it: "Italian",
      ja: "Japanese",
      ko: "Korean",
      nl: "Dutch",
      pt: "Portuguese",
      ru: "Russian",
      sw: "Swahili",
      tr: "Turkish",
      ur: "Urdu",
      yo: "Yoruba",
      zh: "Chinese"
    }

    const detectedLanguage =
      languages[langCode] || `Unknown (${langCode})`

    reply(
`🧠 *Language Detection Result*

📝 Text: ${text}
🌍 Language: ${detectedLanguage}
🔤 Code: ${langCode.toUpperCase()}

> 🔎 Powered by Smart Detect`
    )

  } catch (e) {
    console.log("Detect Error:", e)
    reply("❌ Language detection failed")
  }
},

// 📚 DICTIONARY COMMAND
// Usage:
// .dictionary hello
// .dict freedom

dictionary: async () => {
  if (!isOwner) return reply("❌ My owner only")
  try {
    const word = args.join(" ").trim()

    if (!word) {
      return reply(
        "📚 Enter a word to search\n\nExample:\n.dictionary wisdom"
      )
    }

    // 🌍 Free Dictionary API
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
    )

    if (!res.ok) {
      return reply(
        `❌ Word not found: ${word}`
      )
    }

    const data = await res.json()

    if (!Array.isArray(data) || !data[0]) {
      return reply("❌ No definition found")
    }

    const entry = data[0]

    const wordText =
      entry.word || word

    const phonetic =
      entry.phonetic ||
      "Not available"

    let output =
`📚 *DICTIONARY RESULT*

🔎 Word: *${wordText}*
🗣️ Pronunciation: ${phonetic}

`

    // 📖 Meanings
    entry.meanings
      ?.slice(0, 3)
      .forEach((meaning, i) => {

        output += `📘 *Meaning ${i + 1}* (${meaning.partOfSpeech})\n`

        meaning.definitions
          ?.slice(0, 2)
          .forEach((def, x) => {

            output += `   ${x + 1}. ${def.definition}\n`

            if (def.example) {
              output += `      💬 Example: ${def.example}\n`
            }
          })

        output += "\n"
      })

    // 🔗 Synonyms
    const synonyms =
      entry.meanings
        ?.flatMap(
          m => m.synonyms || []
        )
        ?.slice(0, 8)

    if (synonyms?.length) {
      output +=
`✨ Synonyms: ${synonyms.join(", ")}\n\n`
    }

    // 🔊 Audio pronunciation
    const audio =
      entry.phonetics
        ?.find(
          p => p.audio
        )?.audio

    // 📤 Send result
    await sock.sendMessage(
      jid,
      {
        text: output.trim()
      },
      { quoted: msg }
    )

    // 🔊 Optional pronunciation audio
    if (audio) {
      try {
        await sock.sendMessage(
          jid,
          {
            audio: {
              url: audio
            },
            mimetype:
              "audio/mpeg",
            ptt: false
          },
          { quoted: msg }
        )
      } catch {}
    }

  } catch (e) {
    console.log(
      "DICTIONARY ERROR:",
      e
    )

    reply(
      "❌ Failed to fetch dictionary result"
    )
  }
},

// 📚 SHORTCUT
dict: async () => {
  return commands.dictionary()
},

// 👋 ADVANCED WELCOME / GOODBYE SETTINGS COMMANDS

// 👋 WELCOME COMMAND
welcome: async () => {
  if (!isGroup) return reply("❌ Group only")
  if (!isOwner) return reply("❌ My owner only")

  const settings = getGroup_Settings(jid)

  const action = args[0]?.toLowerCase()

  if (!action) {
    return reply(
`👋 Welcome Commands:
${PREFIX}welcome on
${PREFIX}welcome off`
    )
  }

  if (action === "on") {
    settings.welcome = true
    saveWelcomeDB(global.group_settings)
    return reply("👋 Welcome enabled")
  }

  if (action === "off") {
    settings.welcome = false
    saveWelcomeDB(global.group_settings)
    return reply("🔕 Welcome disabled")
  }
},

// 🚪 GOODBYE COMMAND
goodbye: async () => {
  if (!isGroup) return reply("❌ Group only")
  if (!isOwner) return reply("❌ My owner only")

  const settings = getGroup_Settings(jid)

  const action = args[0]?.toLowerCase()

  if (!action) {
    return reply(
`🚪 Goodbye Commands:
${PREFIX}goodbye on
${PREFIX}goodbye off`
    )
  }

  if (action === "on") {
    settings.goodbye = true
    saveWelcomeDB(global.group_settings)
    return reply("🚪 Goodbye enabled")
  }

  if (action === "off") {
    settings.goodbye = false
    saveWelcomeDB(global.group_settings)
    return reply("🔕 Goodbye disabled")
  }
},

// ✍️ SET WELCOME
setwelcome: async () => {
  if (!q) return reply("❌ Example: !setwelcome Welcome {user}")

  const settings = getGroup_Settings(jid)

  settings.welcomeText = q

  saveWelcomeDB(global.group_settings)

  reply("✅ Welcome message updated")
},

// ✍️ SET GOODBYE
setgoodbye: async () => {
  if (!isOwner) return reply("❌ My owner only")
  if (!q) return reply("❌ Example: !setgoodbye Bye {user}")

  const settings = getGroup_Settings(jid)

  settings.goodbyeText = q

  saveWelcomeDB(global.group_settings)

  reply("✅ Goodbye message updated")
},

// 👁️ VIEW WELCOME
viewwelcome: async () => {
  if (!isOwner) return reply("❌ My owner only")
  const settings = getGroup_Settings(jid)

  reply(
`👋 Current Welcome Message:

${settings.welcomeText}`
  )
},

// 👁️ VIEW GOODBYE
viewgoodbye: async () => {
  if (!isOwner) return reply("❌ My owner only")
  const settings = getGroup_Settings(jid)

  reply(
`🚪 Current Goodbye Message:

${settings.goodbyeText}`
  )
},

// ♻️ RESET WELCOME
resetwelcome: async () => {
  if (!isOwner) return reply("❌ My owner only")
  const settings = getGroup_Settings(jid)

  settings.welcomeText = DEFAULT_WELCOME

  saveWelcomeDB(global.group_settings)

  reply("♻️ Welcome reset")
},

// ♻️ RESET GOODBYE
resetgoodbye: async () => {
  if (!isOwner) return reply("❌ My owner only")
  const settings = getGroup_Settings(jid)

  settings.goodbyeText = DEFAULT_GOODBYE

  saveWelcomeDB(global.group_settings)

  reply("♻️ Goodbye reset")
},

// 🧪 TEST WELCOME
testwelcome: async () => {
  try {
    if (!isOwner) return reply("❌ My owner only")

    const style = group_settings.welcomestyle || "text"

    const name =
      msg.pushName ||
      sender.split("@")[0] ||
      "User"

    const groupName = isGroup
      ? (await sock.groupMetadata(jid)).subject
      : "Test Group"

    const welcomeText = formatMessage(
      group_settings.welcomeText ||
      "👋 Welcome {user} to *{group}*!",
      {
        user: name,
        group: groupName,
        owner: global.OWNER_NAME || "Bot Owner"
      }
    )

    if (style === "text") {
      return sock.sendMessage(jid, {
        text: welcomeText
      }, { quoted: msg })
    }

    if (style === "image") {
      const img = await generateWelcomeCard(name, groupName)

      return sock.sendMessage(jid, {
        image: fs.readFileSync(img),
        caption: welcomeText
      }, { quoted: msg })
    }

    if (style === "video") {
      const video = "./welcome.mp4"

      await generateAnimatedWelcome(name, video)

      return sock.sendMessage(jid, {
        video: fs.readFileSync(video),
        caption: welcomeText
      }, { quoted: msg })
    }

    if (style === "voice") {
      const voice = "./welcome.mp3"

      await generateVoice(welcomeText, voice)

      return sock.sendMessage(jid, {
        audio: fs.readFileSync(voice),
        mimetype: "audio/mp4",
        ptt: true
      }, { quoted: msg })
    }

  } catch (e) {
    console.log("TESTWELCOME ERROR:", e)
    reply("❌ Test welcome failed")
  }
},

// 🧪 TEST GOODBYE
testgoodbye: async () => {
  try {
    if (!isOwner) return reply("❌ My owner only")

    const style = group_settings.goodbyestyle || "text"

    const name =
  msg.pushName ||
  sender.split("@")[0] ||
  "User"


    const groupName = isGroup
      ? (await sock.groupMetadata(jid)).subject
      : "Test Group"

    const goodbyeText = formatMessage(
      group_settings.goodbyeText ||
      "🚪 Goodbye {user}, we’ll miss you in *{group}*!",
      {
        user: name,
        group: groupName,
        owner: global.OWNER_NAME || "Bot Owner"
      }
    )

    // 💬 TEXT
    if (style === "text") {
      return sock.sendMessage(jid, {
        text: goodbyeText
      }, { quoted: msg })
    }

    // 🖼️ IMAGE
    if (style === "image") {
      const img = await generateGoodbyeCard(name, groupName)

      return sock.sendMessage(jid, {
        image: fs.readFileSync(img),
        caption: goodbyeText
      }, { quoted: msg })
    }

    // 🎭 VIDEO
    if (style === "video") {
      const video = "./goodbye.mp4"

      await generateAnimatedGoodbye(name, video)

      return sock.sendMessage(jid, {
        video: fs.readFileSync(video),
        caption: goodbyeText
      }, { quoted: msg })
    }

    // 🔊 VOICE
    if (style === "voice") {
      const voice = "./goodbye.mp3"

      await generateVoice(goodbyeText, voice)

      return sock.sendMessage(jid, {
        audio: fs.readFileSync(voice),
        mimetype: "audio/mp4",
        ptt: true
      }, { quoted: msg })
    }

  } catch (e) {
    console.log("TESTGOODBYE ERROR:", e)
    reply("❌ Test goodbye failed")
  }
},

// 🎭 WELCOME STYLE
welcomestyle: async () => {
  try {

    if (!isOwner) return reply("❌ My owner only")

    const style = args[0]
    if (!style) {
      return reply(
`❌ Usage: !welcomestyle text | image | video | voice`
      )
    }

    group_settings.welcomestyle = style

    reply(`✅ Welcome style set to: ${style}`)

  } catch (e) {
    console.log("WELCOMESTYLE ERROR:", e)
    reply("❌ Failed to set welcome style")
  }
},

// 🎭 GOODBYE STYLE
goodbyestyle: async () => {
  try {

    if (!isOwner) return reply("❌ My owner only")

    const style = args[0]
    if (!style) {
      return reply(
`❌ Usage: !goodbyestyle text | image | video | voice`
      )
    }

    group_settings.goodbyestyle = style

    reply(`✅ Goodbye style set to: ${style}`)

  } catch (e) {
    console.log("GOODBYSTYLE ERROR:", e)
    reply("❌ Failed to set goodbye style")
  }
},

// 🎨 WELCOME COLOR
welcomecolor: async () => {
  if (!isOwner) return reply("❌ My owner only")
  if (!q) return reply(`❌ Example: ${PREFIX}welcomecolor blue`)

  const settings = getGroup_Settings(jid)
  settings.welcomecolor = q
  saveWelcomeDB(global.group_settings)

  reply(`🎨 Welcome color set to: ${q}`)
},

// 🎨 GOODBYE COLOR
goodbyecolor: async () => {
  if (!isOwner) return reply("❌ My owner only")
  if (!q) return reply(`❌ Example: ${PREFIX}goodbyecolor red`)

  const settings = getGroup_Settings(jid)
  settings.goodbyecolor = q
  saveWelcomeDB(global.group_settings)

  reply(`🎨 Goodbye color set to: ${q}`)
},

// ⏳ WELCOME DELAY
welcomedelay: async () => {
  if (!isOwner) return reply("❌ My owner only")

  const seconds = parseInt(args[0])

  if (isNaN(seconds) || seconds < 0 || seconds > 300) {
    return reply(
`❌ Usage:
${PREFIX}welcomedelay 5

⚠️ Range: 0 - 300 seconds`
    )
  }

  const settings = getGroup_Settings(jid)
  settings.welcomedelay = seconds
  saveWelcomeDB(global.group_settings)

  reply(`⏳ Welcome delay set to ${seconds}s`)
},

// 📜 RULES WELCOME
ruleswelcome: async () => {
  if (!isOwner) return reply("❌ My owner only")

  const action = args[0]?.toLowerCase()

  if (!["on", "off"].includes(action)) {
    return reply(
`❌ Usage:
${PREFIX}ruleswelcome on
${PREFIX}ruleswelcome off`
    )
  }

  const settings = getGroup_Settings(jid)
  settings.ruleswelcome = action === "on"
  saveWelcomeDB(global.group_settings)

  reply(`📜 Rules Welcome ${action === "on" ? "enabled" : "disabled"}`)
},

// 📍 AUTO ROLE
autorole: async () => {
  if (!isGroup) return reply("❌ Group only")
  if (!isOwner) return reply("❌ My owner only")

  const action = args[0]?.toLowerCase()

  if (!["on", "off"].includes(action)) {
    return reply(
`❌ Usage:
${PREFIX}autorole on
${PREFIX}autorole off`
    )
  }

  const settings = getGroup_Settings(jid)
  settings.autorole = action === "on"
  saveWelcomeDB(global.group_settings)

  reply(`📍 Auto Role ${action === "on" ? "enabled" : "disabled"}`)
},

// 👑 AUTO PROMOTE
autopromote: async () => {
  if (!isGroup) return reply("❌ Group only")
  if (!isOwner) return reply("❌ My owner only")

  const action = args[0]?.toLowerCase()

  if (!["on", "off"].includes(action)) {
    return reply(
`❌ Usage:
${PREFIX}autopromote on
${PREFIX}autopromote off`
    )
  }

  const settings = getGroup_Settings(jid)
  settings.autopromote = action === "on"
  saveWelcomeDB(global.group_settings)

  reply(`👑 Auto Promote ${action === "on" ? "enabled" : "disabled"}`)
},

// ⬇️ AUTO DEMOTE
autodemote: async () => {
  if (!isGroup) return reply("❌ Group only")
  if (!isOwner) return reply("❌ My owner only")

  const action = args[0]?.toLowerCase()

  if (!["on", "off"].includes(action)) {
    return reply(
`❌ Usage:
${PREFIX}autodemote on
${PREFIX}autodemote off`
    )
  }

  const settings = getGroup_Settings(jid)
  settings.autodemote = action === "on"
  saveWelcomeDB(global.group_settings)

  reply(`⬇️ Auto Demote ${action === "on" ? "enabled" : "disabled"}`)
},

// 🧹 AUTO CLEAN
autoclean: async () => {
  if (!isGroup) return reply("❌ Group only")
  if (!isOwner) return reply("❌ My owner only")

  const action = args[0]?.toLowerCase()

  if (!["on", "off"].includes(action)) {
    return reply(
`❌ Usage:
${PREFIX}autoclean on
${PREFIX}autoclean off`
    )
  }

  const settings = getGroup_Settings(jid)
  settings.autoclean = action === "on"
  saveWelcomeDB(global.group_settings)

  reply(`🧹 Auto Clean ${action === "on" ? "enabled" : "disabled"}`)
},

// 🎁 AUTO GIFT
autogift: async () => {
  if (!isGroup) return reply("❌ Group only")
  if (!isOwner) return reply("❌ My owner only")

  const action = args[0]?.toLowerCase()

  if (!["on", "off"].includes(action)) {
    return reply(
`❌ Usage:
${PREFIX}autogift on
${PREFIX}autogift off`
    )
  }

  const settings = getGroup_Settings(jid)
  settings.autogift = action === "on"
  saveWelcomeDB(global.group_settings)

  reply(`🎁 Auto Gift ${action === "on" ? "enabled" : "disabled"}`)
},

// 🧠 ADVANCED CALCULATOR — scientific + conversions + percentages
calc: async () => {
  if (!isOwner) return reply("❌ My owner only")
  try {
    if (!q) {
      return reply(
`❌ Enter a calculation

🧠 Command:
${PREFIX}calc 25+5*2

📌 Advanced Examples:
${PREFIX}calc sqrt(144)
${PREFIX}calc sin(30)
${PREFIX}calc cos(60)
${PREFIX}calc tan(45)
${PREFIX}calc log(100)
${PREFIX}calc ln(5)
${PREFIX}calc 5!
${PREFIX}calc 2^8
${PREFIX}calc 50%
${PREFIX}calc pi*5
${PREFIX}calc e^2

📖 Description:
Scientific calculator with trig, logs, factorial, constants & percentages`
      )
    }

    let expression = q.toLowerCase().trim()

    // 🔢 Constants
    expression = expression
      .replace(/\bpi\b/g, "Math.PI")
      .replace(/\be\b/g, "Math.E")

    // 📐 Trig functions (degrees)
    expression = expression
      .replace(/sin\(([^)]+)\)/g, "Math.sin(($1)*Math.PI/180)")
      .replace(/cos\(([^)]+)\)/g, "Math.cos(($1)*Math.PI/180)")
      .replace(/tan\(([^)]+)\)/g, "Math.tan(($1)*Math.PI/180)")

    // 🔬 Scientific
    expression = expression
      .replace(/sqrt\(([^)]+)\)/g, "Math.sqrt($1)")
      .replace(/log\(([^)]+)\)/g, "Math.log10($1)")
      .replace(/ln\(([^)]+)\)/g, "Math.log($1)")
      .replace(/abs\(([^)]+)\)/g, "Math.abs($1)")

    // 📊 Power
    expression = expression.replace(/(\d+)\^(\d+)/g, "($1**$2)")

    // 💯 Percent
    expression = expression.replace(/(\d+)%/g, "($1/100)")

    // 🔥 Factorial
    expression = expression.replace(/(\d+)!/g, (_, n) => {
      let num = parseInt(n)
      let fact = 1
      for (let i = 2; i <= num; i++) fact *= i
      return fact
    })

    // 🔒 Security filter
    if (/[^0-9+\-*/%.(),\s*MathPIElogqrtansincoabt]/i.test(expression)) {
      return reply("❌ Unsupported or unsafe expression")
    }

    let result

    try {
      result = Function(`"use strict"; return (${expression})`)()
    } catch {
      return reply("❌ Invalid calculation syntax")
    }

    if (
      result === undefined ||
      result === null ||
      Number.isNaN(result) ||
      !Number.isFinite(result)
    ) {
      return reply("❌ Could not calculate")
    }

    // 🔢 Clean long decimals
    if (typeof result === "number") {
      result = parseFloat(result.toFixed(10))
    }

    await sock.sendMessage(jid, {
      react: {
        text: "🧠",
        key: msg.key
      }
    })

    reply(
`🧠 *Scientific Calculator*

📥 Expression:
${q}

📤 Result:
${result}`
    )

  } catch (e) {
    console.log("ADV CALC ERROR:", e)

    reply(
`❌ Calculation failed

⚠️ Supported:
• + - * / %
• sqrt()
• sin() cos() tan()
• log() ln()
• factorial (!)
• powers (^)
• pi, e`
    )
  }
},

calculate: async () => {
   if (!isOwner) return reply("❌ My owner only")
  try {
    if (!q) return reply("❌ Example: !calculate 5+5*2")

    // Safety filter (prevents code injection)
    if (!/^[0-9+\-*/().\s^%]+$/.test(q)) {
      return reply("❌ Invalid math expression")
    }

    let expression = q
      .replace(/\^/g, "**") // power support

    const result = Function(`"use strict"; return (${expression})`)()

    reply(`🧮 Result:\n${q} = ${result}`)
  } catch (e) {
    console.log("CALC ERROR:", e)
    reply("❌ Calculation error")
  }
},

math: async () => {
   if (!isOwner) return reply("❌ My owner only")
  try {
    if (!q) return reply("❌ Example: !math sin(90) + sqrt(16)")

    const result = math.evaluate(q)

    reply(
`📊 *Advanced Scientific Math*

🧮 ${q}
✅ = ${result}`
    )

  } catch (e) {
    console.log("MATH ERROR:", e)
    reply("❌ Invalid math expression")
  }
},

// 🎮 FUN & GAMES COMMANDS

truth: async () => {
   if (!isOwner) return reply("❌ My owner only")
  const truths = [
    "What is your biggest fear?",
    "Who was your first crush?",
    "What secret have you never told anyone?",
    "What is your most embarrassing moment?",
    "Have you ever lied to your best friend?",
    "What is your guilty pleasure?",
    "What is the weirdest dream you've had?",
    "Who in this chat would you date?",
    "What is your worst habit?",
    "What is one thing you regret?"
  ]

  const random = truths[Math.floor(Math.random() * truths.length)]

  reply(`🎯 *TRUTH*\n\n${random}`)
},

dare: async () => {
   if (!isOwner) return reply("❌ My owner only")
  const dares = [
    "Send a funny selfie right now.",
    "Type using only emojis for 5 minutes.",
    "Sing your favorite song in voice note.",
    "Message your crush 'Hi 😏'",
    "Do 10 pushups now.",
    "Change your profile pic for 1 hour.",
    "Say the alphabet backwards.",
    "Talk like a robot for 10 minutes.",
    "Reveal your last search history.",
    "Dance and send a video."
  ]

  const random = dares[Math.floor(Math.random() * dares.length)]

  reply(`🔥 *DARE*\n\n${random}`)
},

joke: async () => {
   if (!isOwner) return reply("❌ My owner only")
  const jokes = [
    "😂 Why don’t skeletons fight each other? They don’t have the guts.",
    "😂 Why did the scarecrow win an award? Because he was outstanding in his field.",
    "😂 Why did the math book look sad? Because it had too many problems.",
    "😂 Why can’t your nose be 12 inches long? Because then it’d be a foot.",
    "😂 Why did the computer go to therapy? It had too many bytes."
  ]

  reply(jokes[Math.floor(Math.random() * jokes.length)])
},

quote: async () => {
   if (!isOwner) return reply("❌ My owner only")
  const quotes = [
    "✨ Believe you can and you're halfway there.",
    "✨ Success is not final, failure is not fatal.",
    "✨ Dream big. Start small. Act now.",
    "✨ Do what you can with what you have.",
    "✨ Great things never come from comfort zones."
  ]

  reply(quotes[Math.floor(Math.random() * quotes.length)])
},

ship: async () => {
   if (!isOwner) return reply("❌ My owner only")
  const percent = Math.floor(Math.random() * 101)

  reply(`💘 *LOVE METER*\n\nYou two are *${percent}%* compatible ${percent > 70 ? "😍" : percent > 40 ? "🙂" : "😂"}`)
},

pair: async () => {
  if (!isOwner) return reply("❌ My owner only")
  if (!isGroup) return reply("❌ Group only")

  try {
    // ✅ FIX: get group members properly
    const groupMeta = await sock.groupMetadata(jid)

    const members = groupMeta.participants
      .map(p => p.id)
      .filter(id => id !== sock.user.id)

    if (members.length < 2) {
      return reply("❌ Not enough members to pair")
    }

    let person1, person2, pairKey
    let attempts = 0
    const maxAttempts = 30

    do {
      person1 = members[Math.floor(Math.random() * members.length)]

      do {
        person2 = members[Math.floor(Math.random() * members.length)]
      } while (person1 === person2)

      const sorted = [person1, person2].sort()
      pairKey = `${sorted[0]}|${sorted[1]}`

      attempts++

      if (!pairCache.has(pairKey)) break

    } while (attempts < maxAttempts)

    if (pairCache.has(pairKey)) {
      pairCache.clear()
    }

    pairCache.add(pairKey)

    const percent = Math.floor(Math.random() * 41) + 60

    let result =
      percent >= 95 ? "💍 Marriage Loading!" :
      percent >= 85 ? "🔥 Perfect Match!" :
      percent >= 75 ? "😍 Great Pair!" :
      "😂 Wahala Pair!"

    await sock.sendMessage(jid, {
      text:
`💞 *UNIQUE PAIR GAME*

@${person1.split("@")[0]} ❤️ @${person2.split("@")[0]}

💘 Compatibility: *${percent}%*
${result}

📌 This pair won't repeat until reset.`,
      mentions: [person1, person2]
    }, { quoted: msg })

  } catch (e) {
    console.log("PAIR ERROR:", e)
    reply("❌ Failed to generate pair")
  }
},

fact: async () => {
   if (!isOwner) return reply("❌ My owner only")
  const facts = [
    "🧠 Honey never spoils.",
    "🧠 Octopuses have three hearts.",
    "🧠 Bananas are berries, but strawberries aren't.",
    "🧠 Sharks existed before trees.",
    "🧠 A day on Venus is longer than a year on Venus."
  ]

  reply(facts[Math.floor(Math.random() * facts.length)])
},

riddle: async () => {
   if (!isOwner) return reply("❌ My owner only")
  const riddles = [
    "❓ What has keys but can't open locks?\n\n💡 Answer: A piano.",
    "❓ What has hands but cannot clap?\n\n💡 Answer: A clock.",
    "❓ What gets wetter as it dries?\n\n💡 Answer: A towel.",
    "❓ What has one eye but cannot see?\n\n💡 Answer: A needle.",
    "❓ What goes up but never comes down?\n\n💡 Answer: Your age."
  ]

  reply(riddles[Math.floor(Math.random() * riddles.length)])
},

trivia: async () => {
   if (!isOwner) return reply("❌ My owner only")
  const trivia = [
    "🌍 Which planet is known as the Red Planet?\n\n💡 Mars",
    "🌍 What is the capital of France?\n\n💡 Paris",
    "🌍 Who wrote Romeo and Juliet?\n\n💡 William Shakespeare",
    "🌍 What is the largest ocean?\n\n💡 Pacific Ocean",
    "🌍 How many continents are there?\n\n💡 7"
  ]

  reply(trivia[Math.floor(Math.random() * trivia.length)])
},

guess: async () => {
   if (!isOwner) return reply("❌ My owner only")
  const number = Math.floor(Math.random() * 10) + 1

  reply(`🎲 Guess a number between 1 - 10\n\n💡 Answer: ${number}`)
},

roll: async () => {
   if (!isOwner) return reply("❌ My owner only")
  const dice = Math.floor(Math.random() * 6) + 1

  reply(`🎲 You rolled: *${dice}*`)
},

flip: async () => {
   if (!isOwner) return reply("❌ My owner only")
  const coin = Math.random() < 0.5 ? "Heads 🪙" : "Tails 🪙"

  reply(`🪙 Coin Flip:\n*${coin}*`)
},

      // ===== MENU =====
      
menu: async () => {
  
  const sender =
  normalizeJid(
    msg.key.participant ||
    msg.key.remoteJid ||
    ""
  )

  const header = getHeader()
  
const userRole = getUserRole({
  isOwner,
  isAdmin,
  isBot,
  isGroup
})
    
  const userName =
    msg.pushName ||
    sender.split("@")[0]


    function formatRuntime(seconds) {
  seconds = Number(seconds)

    const d = Math.floor(seconds / (3600 * 24))
  const h = Math.floor(seconds % (3600 * 24) / 3600)
  const m = Math.floor(seconds % 3600 / 60)
  const s = Math.floor(seconds % 60)

  return [
    d ? `${d}d` : "",
    h ? `${h}h` : "",
    m ? `${m}m` : "",
    `${s}s`
  ].filter(Boolean).join(" ")

    }

  const uptime = formatRuntime(process.uptime())
 const from = msg.key.remoteJid 


  // const pushName =
  //   msg.pushName ||
  //   msg.name ||
  //   "Unknown User"

 // ===== ROLE SYSTEM =====
  // let role = "👤 User"

  // try {
  //   if (from.endsWith("@g.us")) {
  //     const metadata = await sock.groupMetadata(from)

  //     const participant = metadata.participants.find(
  //       p => p.id === userJid
  //     )

  //     if (participant) {
  //       if (participant.admin === "superadmin") {
  //         role = "👑 Group Owner"
  //       } else if (participant.admin === "admin") {
  //         role = "🛡️ Group Admin"
  //       } else {
  //         role = "👤 Member"
  //       }
  //     }
  //   }
  // } catch {
  //   role = "👤 User"
  // }

// 📸 RANDOM SMALL MENU IMAGE
// const randomImage = `https://picsum.photos/seed/menu${Date.now()}/500/350`

 // 🌍 Realistic wallpapers:
// const bg = await getPremiumMenuBackground()

  // 📊 SYSTEM INFO
  // const uptime = process.uptime()
  // const uptimeText = `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`

  const memory = (process.memoryUsage().rss / 1024 / 1024).toFixed(2)

  const totalRAM = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2)
  const freeRAM = (os.freemem() / 1024 / 1024 / 1024).toFixed(2)

  const time = moment().tz("Africa/Lagos").format("HH:mm:ss")
  const date = moment().tz("Africa/Lagos").format("DD/MM/YYYY")

  // const ownerText = BOT_OWNERS.length
  //   ? BOT_OWNERS.map(o => `• @${o.split("@")[0]}`).join("\n")
  //   : "• No owners set"

  // // 🌅 GREETING SYSTEM
  // const hour = new Date().getHours()
  // const greet =
  //   hour < 12 ? "🌅 Good Morning" :
  //   hour < 16 ? "🌞 Good Afternoon" :
  //               "🌙 Good Evening"

  // ================= GREETING SYSTEM =================
function getGreeting() {
  const hour = new Date().getHours()

  if (hour >= 5 && hour < 12) {
    return "🌅 Good Morning"
  }

  if (hour >= 12 && hour < 17) {
    return "☀️ Good Afternoon"
  }

  if (hour >= 17 && hour < 21) {
    return "🌆 Good Evening"
  }

  return "🌙 Good Night"
}

// ================= OPTIONAL THEME LABEL =================
function getThemeLabel() {
  const hour = new Date().getHours()

  if (hour >= 5 && hour < 12) return "Morning Serenity"
  if (hour >= 12 && hour < 17) return "Golden Daylight"
  if (hour >= 17 && hour < 21) return "Sunset Vibes"

  return "Moonlight Dreams"
}


 if (!isOwner) return reply("❌ My owner only")
  

  // 📜 MENU TEXT

   let menuText = `
╔═══━━━── • ──━━━═══╗
 ${header}
╚═══━━━── • ──━━━═══╝

${getGreeting()}, *${userName}* 👋
How can I be of assisstance to you today 😁

🕒 ${time}
📅 ${date}
🎨 Theme: ${getThemeLabel()}
🪪 Role: ${userRole}
👑 Owners: ${BOT_OWNERS.length}
👤 Owner Name: ${global.OWNER_NAME || "Bot Owner"}
📊 Messages: ${BOT_STATS.messages}
⚡ Runtime: ${uptime}
🛠️ Mode: ${settings?.mode || "public"}
🔰 Prefix: ${PREFIX}

━━━━━━━━━━━━━━━━━━
`

 for (const category in PREMIUM_MENU_SECTIONS) {
  menuText += `\n╭─❍ ${category}\n`

  for (const command of PREMIUM_MENU_SECTIONS[category]) {
    const desc = COMMAND_DESCRIPTIONS[command] || "No description"

    menuText += `│ ${command}\n`
    menuText += `│ ➜ ${desc}\n`
  }
  menuText += `╰────────────\n`
}
    menuText += `
━━━━━━━━━━━━━━━━━━━━
╔═══━━━── • ──━━━═══╗
                POWERED BY BOSS  
╚═══━━━── • ──━━━═══╝
`
 // ===== SEND MENU WITH WORKING IMAGE =====
  await sock.sendMessage(from, { 
   text: menuText, 
   mentions: [sender] 
  }, { quoted: msg }) 
}
}
    // ================= EXECUTION =================
if (commands[cmd]) {
  try {
    BOT_STATS.commands++

    // ✅ REACT FIRST
 
    const emoji = COMMAND_REACTIONS[cmd]
     if (emoji) {
      await react(emoji)
    }
    // ⏳ small delay ensures reaction shows first (important on WhatsApp)
    await new Promise(r => setTimeout(r, 200))

    await commands[cmd]()
    await react("✅")

  } catch (e) {
    console.log(`❌ Command Error (${cmd}):`, e)

    await react("❌")
    return reply("❌ Command execution failed")
  }

} else {
  await react("❓")
  return reply("❌ Unknown command")
} 
  })

return sock
} catch (err) {
    console.log("🔥 Start error:", err)

    if (!reconnecting) {
      reconnecting = true
      setTimeout(() => start(session), 5000)
    }

}
}

// =================  SESSION =================
;["session"].forEach(start)