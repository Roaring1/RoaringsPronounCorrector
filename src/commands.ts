import { ApplicationCommandInputType, ApplicationCommandOptionType, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import { DuplicateTracker } from "./duplicateTracker";
import { parseContextualPronouns, fetchPronouns, shouldCorrect, getCacheStats, clearPronounCache, PronounSource } from "./pronouns";

export function registerCommands(duplicateTracker: DuplicateTracker) {
    return [
        {
            name: "pc-stats",
            description: "Show pronoun correction statistics",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "user",
                    description: "Show stats for specific user",
                    type: ApplicationCommandOptionType.USER,
                    required: false
                },
                {
                    name: "channel", 
                    description: "Show stats for specific channel",
                    type: ApplicationCommandOptionType.CHANNEL,
                    required: false
                }
            ],
            execute: async (args: any[], ctx: any) => {
                try {
                    if (args[0]?.value) {
                        // User stats
                        const userId = args[0].value;
                        const stats = duplicateTracker.getUserStats(userId);
                        
                        const embed = {
                            title: `📊 Pronoun Correction Stats for <@${userId}>`,
                            color: 0x5865F2,
                            fields: [
                                {
                                    name: "Total Corrections",
                                    value: stats.totalCorrections.toString(),
                                    inline: true
                                },
                                {
                                    name: "Recent Corrections",
                                    value: stats.recentCorrections.toString(),
                                    inline: true
                                },
                                {
                                    name: "Channels",
                                    value: stats.channelsWithCorrections.length.toString(),
                                    inline: true
                                }
                            ],
                            footer: {
                                text: `First: ${stats.oldestCorrection?.toLocaleDateString() || "N/A"} | Latest: ${stats.newestCorrection?.toLocaleDateString() || "N/A"}`
                            }
                        };

                        sendBotMessage(ctx.channel.id, { embeds: [embed] });
                    } else if (args[1]?.value) {
                        // Channel stats
                        const channelId = args[1].value;
                        const stats = duplicateTracker.getChannelStats(channelId);
                        
                        const embed = {
                            title: `📊 Pronoun Correction Stats for <#${channelId}>`,
                            color: 0x5865F2,
                            fields: [
                                {
                                    name: "Total Corrections",
                                    value: stats.totalCorrections.toString(),
                                    inline: true
                                },
                                {
                                    name: "Recent Corrections",
                                    value: stats.recentCorrections.toString(),
                                    inline: true
                                },
                                {
                                    name: "Unique Users",
                                    value: stats.uniqueUsers.toString(),
                                    inline: true
                                }
                            ],
                            footer: {
                                text: `First: ${stats.oldestCorrection?.toLocaleDateString() || "N/A"} | Latest: ${stats.newestCorrection?.toLocaleDateString() || "N/A"}`
                            }
                        };

                        sendBotMessage(ctx.channel.id, { embeds: [embed] });
                    } else {
                        // Global stats
                        const totalSize = duplicateTracker.size();
                        const cacheStats = getCacheStats();
                        
                        const embed = {
                            title: "📊 Global Pronoun Correction Stats",
                            color: 0x5865F2,
                            fields: [
                                {
                                    name: "Total Corrections Tracked",
                                    value: totalSize.toString(),
                                    inline: true
                                },
                                {
                                    name: "Cached Pronouns",
                                    value: cacheStats.size.toString(),
                                    inline: true
                                },
                                {
                                    name: "Settings",
                                    value: `Window: ${duplicateTracker.getSettings().windowMinutes}min\nMax per window: ${duplicateTracker.getSettings().maxCorrectionsPerWindow}`,
                                    inline: true
                                }
                            ],
                            footer: {
                                text: "Use with @user or #channel for specific stats"
                            }
                        };

                        sendBotMessage(ctx.channel.id, { embeds: [embed] });
                    }
                } catch (error) {
                    console.error("[PronounCorrector] Error in stats command:", error);
                    sendBotMessage(ctx.channel.id, { 
                        content: "❌ Error retrieving stats. Check console for details." 
                    });
                }
            }
        },

        {
            name: "pc-clear",
            description: "Clear correction history (Admin only)",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "target",
                    description: "What to clear",
                    type: ApplicationCommandOptionType.STRING,
                    required: true,
                    choices: [
                        { name: "All records", value: "all" },
                        { name: "User records", value: "user" },
                        { name: "Channel records", value: "channel" },
                        { name: "Pronoun cache", value: "cache" }
                    ]
                },
                {
                    name: "id",
                    description: "User or channel ID to clear",
                    type: ApplicationCommandOptionType.STRING,
                    required: false
                }
            ],
            execute: async (args: any[], ctx: any) => {
                try {
                    // Check if user has permission (you might want to add actual permission checking)
                    const target = args[0]?.value;
                    const id = args[1]?.value;

                    let cleared = 0;
                    let message = "";

                    switch (target) {
                        case "all":
                            cleared = duplicateTracker.size();
                            duplicateTracker.clear();
                            clearPronounCache();
                            message = `✅ Cleared all ${cleared} correction records and pronoun cache.`;
                            break;

                        case "user":
                            if (!id) {
                                sendBotMessage(ctx.channel.id, { 
                                    content: "❌ User ID required for user clearing." 
                                });
                                return;
                            }
                            cleared = duplicateTracker.clearUserRecords(id);
                            message = `✅ Cleared ${cleared} correction records for <@${id}>.`;
                            break;

                        case "channel":
                            if (!id) {
                                sendBotMessage(ctx.channel.id, { 
                                    content: "❌ Channel ID required for channel clearing." 
                                });
                                return;
                            }
                            cleared = duplicateTracker.clearChannelRecords(id);
                            message = `✅ Cleared ${cleared} correction records for <#${id}>.`;
                            break;

                        case "cache":
                            const cacheSize = getCacheStats().size;
                            clearPronounCache();
                            message = `✅ Cleared ${cacheSize} cached pronoun entries.`;
                            break;

                        default:
                            sendBotMessage(ctx.channel.id, { 
                                content: "❌ Invalid target. Use all, user, channel, or cache." 
                            });
                            return;
                    }

                    sendBotMessage(ctx.channel.id, { content: message });
                } catch (error) {
                    console.error("[PronounCorrector] Error in clear command:", error);
                    sendBotMessage(ctx.channel.id, { 
                        content: "❌ Error clearing data. Check console for details." 
                    });
                }
            }
        },

        {
            name: "pc-test",
            description: "Test pronoun detection on a message",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "message",
                    description: "Message to test",
                    type: ApplicationCommandOptionType.STRING,
                    required: true
                },
                {
                    name: "user",
                    description: "User to test against (defaults to command user)",
                    type: ApplicationCommandOptionType.USER,
                    required: false
                }
            ],
            execute: async (args: any[], ctx: any) => {
                try {
                    const message = args[0]?.value;
                    const userId = args[1]?.value || ctx.user.id;

                    if (!message) {
                        sendBotMessage(ctx.channel.id, { 
                            content: "❌ Message content required." 
                        });
                        return;
                    }

                    // Add a mention to the test message if it doesn't have one
                    const testMessage = message.includes(`<@${userId}>`) ? message : `${message} <@${userId}>`;

                    // Parse the message
                    const analysis = parseContextualPronouns(testMessage, {
                        skipQuotes: true,
                        contextAwareness: true
                    });

                    // Fetch user pronouns
                    const userPronouns = await fetchPronouns(userId, {
                        sources: [PronounSource.PRONOUNDB]
                    });

                    // Check if correction is needed
                    const correction = shouldCorrect(analysis, userPronouns, userId, {
                        requireConfidence: 75,
                        contextAwareness: true
                    });

                    const embed = {
                        title: "🧪 Pronoun Detection Test",
                        color: correction.shouldCorrect ? 0xFF6B6B : 0x51CF66,
                        fields: [
                            {
                                name: "Test Message",
                                value: `\`\`\`${testMessage}\`\`\``,
                                inline: false
                            },
                            {
                                name: "User Pronouns",
                                value: userPronouns || "unspecified",
                                inline: true
                            },
                            {
                                name: "Found Pronouns",
                                value: analysis.foundPronouns.map(p => 
                                    `${p.pronoun} (${p.confidence}%)`
                                ).join(", ") || "None",
                                inline: true
                            },
                            {
                                name: "Correction Needed",
                                value: correction.shouldCorrect ? "Yes" : "No",
                                inline: true
                            },
                            {
                                name: "Confidence",
                                value: `${correction.confidence}%`,
                                inline: true
                            },
                            {
                                name: "Reasoning",
                                value: correction.reasoning,
                                inline: false
                            }
                        ]
                    };

                    if (correction.incorrectPronouns.length > 0) {
                        embed.fields.push({
                            name: "Incorrect Pronouns Found",
                            value: correction.incorrectPronouns.join(", "),
                            inline: true
                        });
                    }

                    sendBotMessage(ctx.channel.id, { embeds: [embed] });
                } catch (error) {
                    console.error("[PronounCorrector] Error in test command:", error);
                    sendBotMessage(ctx.channel.id, { 
                        content: "❌ Error testing message. Check console for details." 
                    });
                }
            }
        }
    ];
}

export function formatUptime(startTime: number): string {
    const uptime = Date.now() - startTime;
    const seconds = Math.floor(uptime / 1000) % 60;
    const minutes = Math.floor(uptime / 60000) % 60;
    const hours = Math.floor(uptime / 3600000) % 24;
    const days = Math.floor(uptime / 86400000);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
}

export function createDebugEmbed(title: string, data: any): any {
    return {
        title: `🐛 Debug: ${title}`,
        color: 0xFFA500,
        description: `\`\`\`json\n${JSON.stringify(data, null, 2)}\`\`\``,
        timestamp: new Date().toISOString(),
        footer: {
            text: "PronounCorrector Debug Mode"
        }
    };
}

export function validateSettings(settings: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (settings.cooldownMinutes < 1 || settings.cooldownMinutes > 1440) {
        errors.push("Cooldown must be between 1 and 1440 minutes");
    }

    if (settings.maxCorrectionsPerUser < 1 || settings.maxCorrectionsPerUser > 50) {
        errors.push("Max corrections per user must be between 1 and 50");
    }

    if (settings.requireConfidence < 0 || settings.requireConfidence > 100) {
        errors.push("Confidence requirement must be between 0 and 100");
    }

    if (settings.customApiUrl && !settings.customApiUrl.includes("{userId}")) {
        errors.push("Custom API URL must include {userId} placeholder");
    }

    return {
        valid: errors.length === 0,
        errors
    };
}