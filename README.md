# Roaring's Pronoun Auto-Corrector for Vencord

A personal Discord plugin that automatically corrects pronouns in **my own messages** before I send them, helping me be more respectful and inclusive in my communication.

## 🎯 What This Plugin Does For Me

**This is NOT a bot** - it's my personal auto-correction tool that:

✅ **Checks MY messages before I send them**  
✅ **Auto-corrects wrong pronouns** in real-time  
✅ **Works in DMs without @mentions** - automatically knows I'm talking about the other person  
✅ **Blocks messages** with wrong pronouns (if I want)  
✅ **Shows me notifications** when corrections happen  
✅ **Works silently** - nobody else sees corrections happening  

## 🚀 How It Works

### **In Regular Channels:**
1. **I type a message** mentioning someone: `"He is really good at coding @Alice"`
2. **Plugin checks Alice's pronouns** (she/her from PronounDB)
3. **Plugin auto-corrects** my message to: `"She is really good at coding @Alice"`
4. **I send the corrected message** - Alice never sees the mistake!

### **In DMs (NEW!):**
1. **I type a message** with pronouns: `"He told me about the project"`
2. **Plugin automatically knows** I'm talking about the person I'm DMing
3. **Plugin checks their pronouns** (she/her from PronounDB)
4. **Plugin auto-corrects** to: `"She told me about the project"`
5. **Message sends corrected** - no @mention needed!

## ⚙️ My Correction Options

### **Auto-Correct Mode** (Recommended)
- Automatically fixes pronouns in my messages
- Shows me a notification of what was changed
- Message sends with correct pronouns

### **Block and Warn Mode**
- Stops my message from sending if wrong pronouns detected
- Shows me what needs to be fixed
- I can edit and resend manually

### **Ask First Mode**
- Asks me before applying corrections
- Shows me what will be changed
- I can approve or cancel

## 🔧 Installation

1. **Download/Clone** this repository
2. **Copy files** to your Vencord plugins folder:
   ```
   Vencord/src/userplugins/RoaringsPronounCorrector/
   ├── index.ts
   ├── pronounAutoCorrect.ts
   └── manifest.json
   ```
3. **Build Vencord**: `pnpm build --watch`
4. **Reload Discord** completely
5. **Enable in Settings**: Discord → Vencord → Plugins → "RoaringsPronounAutoCorrect"

## ⚙️ My Settings

| Setting | What It Does | Options |
|---------|--------------|---------|
| **Correction Mode** | How I handle wrong pronouns | Auto-correct, Block & warn, Ask first |
| **Pronoun Sources** | Where I check for pronouns | PronounDB, Discord Bio, My custom API |
| **Show Notifications** | Tell me when corrections happen | On/Off |
| **Confidence Level** | How sure the detection should be | 60-95% |
| **Skip Quoted Text** | Don't correct in quotes/code | On/Off |

## 🎛️ Advanced Features

### **Multiple Data Sources**
- **PronounDB**: Community database (default)
- **Discord Bio**: Extract from user profiles (coming soon)
- **My Custom API**: Use my own pronoun service

### **Smart Detection**
- Only corrects when confident it's wrong
- Skips quoted text and code blocks
- Preserves original capitalization
- Handles multiple pronoun sets (he/him, she/her, they/them, etc.)

### **Personal Statistics**
- Track how many corrections I've made
- See which mode I use most
- Monitor my inclusive communication progress

## 💡 Examples

### Auto-Correction in Action

**What I type:**
> "Him and his team did great work @Alex"

**What gets sent:** (if Alex uses they/them)
> "They and their team did great work @Alex"

**Notification I see:**
> Auto-corrected: "Him" → "They", "his" → "their"

### Block and Warn Mode

**What I type:**
> "She told me about her project @Jordan"

**What happens:** (if Jordan uses he/him)
> ❌ **Message blocked!** Pronoun corrections needed:
> Jordan uses he/him (you used: she, her)

## 🔧 Technical Details

### Supported Pronouns
- he/him/his/himself
- she/her/hers/herself  
- they/them/their/themselves
- it/its/itself
- xe/xem/xyr/xyrs
- ze/zir/zirs/zirself
- And more!

### How Detection Works
1. **Extract mentions** from my message
2. **Fetch correct pronouns** for each mentioned user
3. **Analyze context** around mentions for wrong pronouns
4. **Calculate confidence** based on grammar and proximity
5. **Apply corrections** based on my chosen mode

### Privacy & Performance
- **No data stored** - everything is in memory only
- **5-minute caching** - reduces API calls
- **Minimal impact** - only processes my messages with mentions
- **Respectful** - never spams APIs or services

## 🚨 Important Notes

### This Plugin Is For Me Only
- ❌ **Does NOT correct other people's messages**
- ❌ **Does NOT send bot messages to chat**
- ❌ **Does NOT monitor conversations**
- ✅ **Only helps ME be more inclusive**

### Limitations
- Requires users to have pronouns in PronounDB or my custom API
- May occasionally miss context-dependent pronouns
- Works best with clear sentence structures
- Custom APIs need to return `{ "pronouns": "she/her" }` format

## 🛠️ Troubleshooting

### Plugin Not Working?
1. Check if it's enabled in Vencord settings
2. Make sure you're mentioning users in messages
3. Verify the mentioned users have pronouns in PronounDB
4. Try lowering the confidence threshold

### Too Many/Few Corrections?
- **Too many**: Increase confidence threshold to 90%+
- **Too few**: Decrease confidence threshold to 70%
- **Wrong corrections**: Enable "Ask First" mode temporarily

### API Issues?
- PronounDB might be down - try again later
- Custom API needs proper format and CORS headers
- Check browser console for error messages

## 🤝 Contributing

Want to help improve my plugin?

1. **Fork** this repository
2. **Make changes** in a new branch
3. **Test thoroughly** with your own messages
4. **Submit a pull request** with description

### Ideas for Contributions
- Support for more pronoun databases
- Better context detection algorithms
- UI improvements for settings
- Additional correction modes
- Performance optimizations

## 📜 License

MIT License - Feel free to modify for your own use!

## 🙏 Acknowledgments

- [PronounDB](https://pronoundb.org/) for providing pronoun data
- [Vencord](https://vencord.dev/) for the plugin framework
- LGBTQ+ community for guidance on inclusive language

## 💬 Support

- **Issues**: [GitHub Issues](https://github.com/Roaring1/RoaringsPronounCorrector/issues)
- **Discord**: Join Vencord Discord for plugin help

---

**Remember**: This plugin helps me communicate more inclusively by correcting my own messages. It's a personal tool for self-improvement, not for monitoring or correcting others!