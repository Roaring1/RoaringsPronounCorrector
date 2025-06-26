# Contributing to Roaring's Pronoun Auto-Corrector

Thanks for your interest in improving my pronoun auto-correction plugin! 

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- Git
- pnpm package manager
- Vencord development build

### Development Setup

1. **Fork and clone this repository**
   ```bash
   git clone https://github.com/your-username/RoaringsPronounCorrector.git
   cd RoaringsPronounCorrector
   ```

2. **Set up Vencord development environment**
   ```bash
   git clone https://github.com/Vendicated/Vencord.git
   cd Vencord
   pnpm install --frozen-lockfile
   pnpm build --dev --watch
   ```

3. **Link your plugin**
   ```bash
   # Copy plugin files to Vencord userplugins folder
   cp -r /path/to/RoaringsPronounCorrector/src/* Vencord/src/userplugins/roaringsPronounAutoCorrect/
   ```

## 🛠️ Making Changes

### Code Style
- Use TypeScript for all code
- Follow existing naming conventions
- Write code in first person (as if Roaring is speaking)
- Add comments for complex logic
- Keep functions focused and small

### Testing Your Changes
1. **Load in Discord**: Restart Discord and enable the plugin
2. **Test scenarios**:
   - Messages with @mentions and wrong pronouns
   - DM conversations with pronouns
   - Edge cases (quotes, code blocks, etc.)
3. **Check all modes**: Auto-correct, block & warn, ask first

### Commit Guidelines
- Use clear, descriptive commit messages
- Start with a verb: "Fix", "Add", "Update", "Remove"
- Reference issues: "Fix #123: Auto-correction in DMs"

## 🎯 Areas for Contribution

### High Priority
- **Better Context Detection**: Improve pronoun context awareness
- **More Pronoun Sources**: Add support for additional APIs
- **Performance**: Optimize for large servers
- **UI Improvements**: Better settings interface

### Medium Priority  
- **Custom Pronouns**: Support for uncommon pronoun sets
- **Learning System**: Remember user corrections
- **Statistics Dashboard**: Visual stats and insights
- **Export/Import**: Settings backup and restore

### Low Priority
- **Themes**: Custom notification styles
- **Sounds**: Audio feedback for corrections
- **Integrations**: Support for other bots/services

## 🐛 Bug Reports

When reporting bugs, please include:
- **Vencord version** and platform (Windows/Mac/Linux)
- **Plugin settings** you're using
- **Steps to reproduce** the issue
- **Expected vs actual behavior**
- **Console logs** if available
- **Screenshots** if relevant

## ✨ Feature Requests

For new features, please:
- Check existing issues first
- Describe the **use case** clearly
- Explain **why** this would be helpful
- Consider **implementation complexity**
- Think about **user experience** impact

## 📝 Documentation

Help improve documentation by:
- Fixing typos and grammar
- Adding examples and use cases
- Updating setup instructions
- Creating video tutorials
- Translating to other languages

## ⚠️ Important Notes

### Respect and Privacy
- This plugin is for personal use only
- Never store or share user data
- Respect Discord's Terms of Service
- Be mindful of privacy concerns

### Technical Limitations
- Plugin only works with Vencord
- Requires development build for custom plugins
- Discord API changes may break functionality
- Performance impact should be minimal

## 🤝 Community Guidelines

- **Be respectful** in all interactions
- **Help others** learn and contribute
- **Share knowledge** about pronoun usage
- **Stay on topic** in discussions
- **Follow Discord community guidelines**

## 📞 Getting Help

- **Issues**: Use GitHub Issues for bugs and features
- **Discussions**: Use GitHub Discussions for questions
- **Discord**: Join Vencord Discord for real-time help
- **Email**: Contact project maintainer directly

## 🏆 Recognition

Contributors will be:
- Added to the credits in README.md
- Mentioned in release notes
- Given appropriate GitHub repository permissions
- Credited in plugin about section

---

**Remember**: This plugin exists to help create more inclusive communication. Every contribution helps make Discord a more welcoming place for everyone! 💙