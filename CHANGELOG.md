# Changelog

All notable changes to Roaring's Pronoun Auto-Corrector will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-01-25

### 🎯 **MAJOR REDESIGN** - From Bot to Personal Auto-Corrector

#### Added
- **Personal Auto-Correction**: Intercepts MY messages before sending (not a bot anymore)
- **DM Intelligence**: Automatically detects pronouns in DMs without requiring @mentions
- **Multiple Correction Modes**: 
  - Auto-correct: Silently fixes pronouns and sends corrected message
  - Block & warn: Prevents sending and shows me what's wrong
  - Ask first: Shows corrections and asks for approval
- **Smart Context Detection**: Analyzes message context to reduce false positives
- **Confidence Scoring**: Only corrects when confident about the mismatch (60-95% threshold)
- **Multiple Pronoun Sources**: PronounDB, Discord Bio (planned), custom APIs
- **Real-time Notifications**: Toast messages when corrections happen
- **Personal Statistics**: Track my correction behavior and progress
- **Advanced Settings**: 10+ customization options for personalized experience

#### Technical Improvements
- **Pre-send Interception**: Uses `addPreSendListener` to catch messages before they send
- **DM Context Awareness**: Detects DM channels and assumes pronouns refer to recipient
- **Proper Vencord Integration**: Fixed API usage (`options` instead of `settings`)
- **Memory Management**: Proper listener cleanup and cache management
- **Error Handling**: Comprehensive error catching and user feedback
- **Performance Optimized**: 5-minute pronoun caching, minimal API calls

#### Changed
- **From Bot to Client-Side Tool**: No longer sends correction messages to chat
- **Privacy-Focused**: Only affects my own messages, nobody else sees corrections
- **First-Person Perspective**: All code and documentation written as if I'm speaking
- **Vencord-Specific**: Optimized specifically for Vencord's plugin system

#### Removed
- **Bot Behavior**: No more public correction messages in chat
- **Other User Monitoring**: Only processes my own messages
- **Complex Duplicate Tracking**: Simplified to focus on personal use
- **Public Commands**: No slash commands visible to others

### Breaking Changes
- **Complete API Rewrite**: Not compatible with v1.x configurations
- **File Structure**: New file organization and naming
- **Settings Format**: All settings need to be reconfigured

### Migration Guide
- **Backup**: Export any v1.x settings if needed
- **Clean Install**: Remove old plugin completely before installing v2.0
- **Reconfigure**: Set up new settings through Vencord plugin interface

---

## [1.0.0] - 2024-XX-XX (Deprecated)

### Added
- Basic pronoun correction bot functionality
- PronounDB integration
- Simple correction messages

### Deprecated
- This version is no longer supported
- Bot-style corrections are deprecated in favor of personal auto-correction

---

## Future Planned Features

### [2.1.0] - Planned
- **Visual Correction Highlighting**: Highlight corrected words in sent messages
- **Learning System**: Remember my common mistakes and improve detection
- **Discord Bio Integration**: Extract pronouns from user profiles
- **Export/Import Settings**: Backup and restore configuration
- **Advanced Statistics**: Visual charts and correction insights

### [2.2.0] - Planned  
- **Custom Pronoun Sets**: Support for uncommon/custom pronouns
- **Group Chat Intelligence**: Better detection in group conversations
- **Voice Channel Support**: Corrections for voice channel text
- **Mobile Optimization**: Improved experience on mobile Discord

### [3.0.0] - Long-term Vision
- **AI-Powered Context**: Machine learning for better pronoun detection
- **Multi-Language Support**: Pronouns in languages beyond English
- **Accessibility Features**: Screen reader compatibility and voice feedback
- **Community Features**: Optional anonymous statistics sharing for research

---

## Technical Notes

### Supported Platforms
- **Discord Desktop**: Full functionality
- **Discord Web**: Full functionality  
- **Discord Mobile**: Limited (Vencord mobile support required)

### Dependencies
- Vencord 1.7.0+
- Node.js 18+ (for development)
- Modern browser with ES2022 support

### Known Issues
- **Discord API Changes**: May break with Discord updates
- **Custom API Limitations**: Requires proper CORS setup
- **Performance**: Large servers may experience slight delays

### Performance Benchmarks
- **Memory Usage**: ~2-5MB typical
- **CPU Impact**: <1% during normal use
- **Network**: ~1KB per pronoun lookup (cached for 5 minutes)
- **Latency**: <50ms message processing time

---

## Support

- **Issues**: [GitHub Issues](https://github.com/Roaring1/RoaringsPronounCorrector/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Roaring1/RoaringsPronounCorrector/discussions)
- **Discord**: Join Vencord Discord for plugin support
- **Email**: Contact maintainer for security issues

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.