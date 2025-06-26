 Enhanced Pronoun Corrector Plugin for Vencord

A comprehensive Discord plugin that automatically detects potential misgendering and provides gentle corrections based on users' preferred pronouns, with advanced context awareness and extensive customization options.

  Features

 Core Functionality
- Automatic Detection: Scans messages for pronoun usage and mentions
- Context Awareness: Advanced parsing to reduce false positives
- Multiple Data Sources: PronounDB, Discord Bio, and custom API support
- Confidence Scoring: Only corrects when confident about the mismatch
- Duplicate Prevention: Prevents spam corrections for the same user

 Advanced Features
- Customizable Correction Tones: Gentle, neutral, educational, or custom messages
- Smart Filtering: Skips quoted text, code blocks, and bot messages
- Rate Limiting: Configurable cooldowns and daily limits per user
- Statistics Tracking: Detailed analytics for users and channels
- Management Commands: Clear records, view stats, and test detection

 🚀 Installation

 Prerequisites
- [Vencord](https://vencord.dev/) installed and running
- Node.js development environment (for building)

 Install Steps

1. Clone/Download the plugin files to your Vencord plugins directory:
   ```
   src/userplugins/pronounCorrector/
   ├── index.ts
   ├── pronouns.ts
   ├── duplicateTracker.ts
   ├── commands.ts
   └── manifest.json
   ```

2. Build Vencord with the new plugin:
   ```bash
   pnpm build --watch
   ```

3. Reload Discord completely (Ctrl+R or restart)

4. Enable the plugin:
   - Open Discord Settings
   - Go to Vencord → Plugins
   - Find "PronounCorrector" and enable it

 ⚙️ Configuration

Access settings through: Discord Settings → Vencord → Plugins → PronounCorrector

 Basic Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Enabled | Master toggle for the plugin | `true` |
| Correction Tone | How corrections are delivered | `Gentle` |
| Custom Message | Template for custom tone | See below |
| Skip Bots | Ignore messages from bots | `true` |
| Skip Quotes | Ignore quoted text and code | `true` |

 Data Sources

| Source | Description | Status |
|--------|-------------|---------|
| PronounDB | Community pronoun database | ✅ Active |
| Discord Bio | Extract from user profiles | 🚧 Planned |
| Custom API | Your own pronoun service | ✅ Active |

 Advanced Settings

| Setting | Description | Range | Default |
|---------|-------------|--------|---------|
| Cooldown Minutes | Time between corrections per user/channel | 5-120 | 30 |
| Max Corrections Per User | Daily limit per user | 1-10 | 3 |
| Require Confidence | Minimum confidence % for corrections | 50-95% | 75% |
| Context Awareness | Enable smart context parsing | Boolean | `true` |

 Custom Message Template

Use these placeholders in your custom message:
- `{user}` - Mention of the user
- `{pronouns}` - Their correct pronouns

Example: `"Hey! {user} actually uses {pronouns} pronouns 💙"`

 🎯 Usage Examples

 Basic Correction
```
User: "He is really good at coding!" (mentioning someone who uses she/her)
Bot: "Hey! Just a gentle reminder that @Alice uses she/her pronouns 💙"
```

 Different Tones

Gentle (default):
> "Hey! Just a gentle reminder that @Alice uses she/her pronouns 💙"

Neutral:
> "@Alice uses she/her pronouns."

Educational:
> "Friendly correction: @Alice uses she/her pronouns. Using correct pronouns shows respect and creates an inclusive environment! 🌈"

Custom:
> "Just a heads up: @Alice uses she/her pronouns! 💙"

 🛠️ Commands

 `/pc-stats [user] [channel]`
View correction statistics

```
/pc-stats                     Global stats
/pc-stats @user              Stats for specific user
/pc-stats channel           Stats for specific channel
```

 `/pc-clear <target> [id]`
Clear correction history (Admin only)

```
/pc-clear all                Clear everything
/pc-clear user 123456        Clear user records
/pc-clear channel 789012     Clear channel records  
/pc-clear cache              Clear pronoun cache
```

 `/pc-test <message> [user]`
Test pronoun detection

```
/pc-test "He is awesome @user"      Test detection
/pc-test "She likes coding" @alice  Test against specific user
```

 🔧 Technical Details

 Context Awareness Algorithm

The plugin uses sophisticated context analysis:

1. Pronoun Extraction: Identifies all pronouns with positions
2. Context Analysis: Examines surrounding text for confidence
3. Mention Correlation: Links pronouns to nearby user mentions
4. False Positive Filtering: Skips quotes, references, fictional content
5. Confidence Scoring: Calculates likelihood of intentional misgendering

 Confidence Factors

Increases Confidence (+)
- Pronouns at sentence start
- Pronouns followed by verbs ("he is", "she said")
- Personal context words ("person", "friend", "colleague")

Decreases Confidence (-)
- Media references ("movie", "song", "character")
- Quoted text or code blocks
- URLs and external references

 Data Sources

 PronounDB Integration
- Fetches from `pronoundb.org/api/v1/lookup`
- Supports all standard pronoun formats
- 5-minute caching with automatic cleanup

 Custom API Format
Your API should return:
```json
{
  "pronouns": "she/her"
}
```

Replace `{userId}` in your URL: `https://api.example.com/pronouns/{userId}`

 Performance

- Memory: ~2-5MB for typical usage
- Network: Minimal (cached requests)
- CPU: Lightweight regex parsing
- Storage: In-memory only (no persistent data)

 🚨 Troubleshooting

 Common Issues

Plugin not loading:
- Ensure all files are in correct directory
- Check console for TypeScript errors
- Verify Vencord version compatibility

No corrections appearing:
- Check if plugin is enabled
- Verify confidence threshold isn't too high
- Test with `/pc-test` command

Too many/few corrections:
- Adjust confidence requirement (Settings)
- Enable/disable context awareness
- Modify cooldown settings

PronounDB not working:
- Check internet connection
- Verify API isn't rate-limited
- Try custom API as backup

 Debug Mode

Enable debug mode in settings to get detailed console logs:

1. Settings → PronounCorrector → Debug Mode: `true`
2. Open Developer Console (F12)
3. Look for `[PronounCorrector]` messages

 Performance Issues

If experiencing lag:
- Increase confidence threshold to reduce processing
- Disable context awareness temporarily
- Clear caches with `/pc-clear cache`

 🤝 Contributing

 Development Setup

1. Fork the repository
2. Clone to your Vencord plugins directory
3. Install dependencies: `pnpm install`
4. Start development build: `pnpm build --watch`

 Adding Features

New Pronoun Sources:
1. Add to `PronounSource` enum in `pronouns.ts`
2. Implement fetch function in `fetchFromSource()`
3. Add UI option in settings

New Context Patterns:
1. Add regex patterns to `POSITIVE_CONTEXT_PATTERNS` or `NEGATIVE_CONTEXT_PATTERNS`
2. Update confidence calculation in `calculateContextConfidence()`

New Commands:
1. Add command definition to `registerCommands()` in `commands.ts`
2. Implement execute function with proper error handling

 Testing

Use the built-in test command:
```
/pc-test "Your test message here @user"
```

Check various scenarios:
- Different pronoun combinations
- Quoted text and code blocks
- False positive patterns
- Edge cases and unusual formatting

 📋 Changelog

 Version 2.0.0 (Current)
-  Complete rewrite with advanced context awareness
-  Multiple pronoun data sources support
-  Comprehensive settings system
-  Duplicate correction prevention
-  Advanced confidence scoring
-  Better language parsing and false positive reduction
-  Statistics tracking and management commands
-  Improved performance and caching

 Version 1.0.0
-  Initial release
-  Basic pronoun correction functionality
-  PronounDB integration

 📜 License

MIT License - feel free to modify and distribute

 🙏 Acknowledgments

- [PronounDB](https://pronoundb.org/) for pronoun data
- [Vencord](https://vencord.dev/) for the plugin framework
- LGBTQ+ community for feedback and guidance

 📞 Support

- Issues: [GitHub Issues](https://github.com/Roaring1/vencord-pronoun-corrector/issues)
- Discord: Join the Vencord Discord for plugin support
- Documentation: Check this README and inline code comments

---

Remember: This plugin aims to create more inclusive spaces. Use it respectfully and be open to feedback from your community.
