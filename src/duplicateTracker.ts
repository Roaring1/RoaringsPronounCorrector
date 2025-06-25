export interface CorrectionRecord {
    channelId: string;
    userId: string;
    timestamp: number;
    messageHash?: string;
}

export interface DuplicateSettings {
    windowMinutes: number;
    maxCorrectionsPerWindow: number;
    cleanupIntervalMinutes: number;
}

export class DuplicateTracker {
    private corrections: Map<string, CorrectionRecord[]> = new Map();
    private cleanupInterval: NodeJS.Timeout | null = null;
    private settings: DuplicateSettings;

    constructor(settings: Partial<DuplicateSettings> = {}) {
        this.settings = {
            windowMinutes: 60, // 1 hour window
            maxCorrectionsPerWindow: 2, // Max 2 corrections per user per hour
            cleanupIntervalMinutes: 30, // Clean up old records every 30 minutes
            ...settings
        };

        this.startCleanupTimer();
    }

    /**
     * Check if a correction would be a duplicate
     */
    isDuplicate(channelId: string, userId: string, messageContent?: string): boolean {
        const key = this.getKey(channelId, userId);
        const records = this.corrections.get(key) || [];
        
        const now = Date.now();
        const windowMs = this.settings.windowMinutes * 60 * 1000;
        
        // Filter to recent corrections within the time window
        const recentCorrections = records.filter(
            record => now - record.timestamp < windowMs
        );

        // Check if we've exceeded the maximum corrections for this window
        if (recentCorrections.length >= this.settings.maxCorrectionsPerWindow) {
            return true;
        }

        // If message content is provided, check for identical corrections
        if (messageContent) {
            const messageHash = this.hashMessage(messageContent);
            const identicalCorrection = recentCorrections.find(
                record => record.messageHash === messageHash
            );
            
            if (identicalCorrection) {
                return true;
            }
        }

        return false;
    }

    /**
     * Add a correction record
     */
    addCorrection(channelId: string, userId: string, messageContent?: string): void {
        const key = this.getKey(channelId, userId);
        const records = this.corrections.get(key) || [];
        
        const newRecord: CorrectionRecord = {
            channelId,
            userId,
            timestamp: Date.now(),
            messageHash: messageContent ? this.hashMessage(messageContent) : undefined
        };

        records.push(newRecord);
        this.corrections.set(key, records);
    }

    /**
     * Get recent corrections for a user in a channel
     */
    getRecentCorrections(channelId: string, userId: string, windowMinutes?: number): CorrectionRecord[] {
        const key = this.getKey(channelId, userId);
        const records = this.corrections.get(key) || [];
        
        const windowMs = (windowMinutes || this.settings.windowMinutes) * 60 * 1000;
        const now = Date.now();
        
        return records.filter(record => now - record.timestamp < windowMs);
    }

    /**
     * Get correction statistics for a user
     */
    getUserStats(userId: string): {
        totalCorrections: number;
        recentCorrections: number;
        channelsWithCorrections: string[];
        oldestCorrection?: Date;
        newestCorrection?: Date;
    } {
        let totalCorrections = 0;
        let recentCorrections = 0;
        const channelsWithCorrections = new Set<string>();
        let oldestTimestamp = Infinity;
        let newestTimestamp = 0;

        const windowMs = this.settings.windowMinutes * 60 * 1000;
        const now = Date.now();

        for (const [key, records] of this.corrections.entries()) {
            const userRecords = records.filter(record => record.userId === userId);
            
            if (userRecords.length > 0) {
                totalCorrections += userRecords.length;
                channelsWithCorrections.add(userRecords[0].channelId);
                
                // Count recent corrections
                recentCorrections += userRecords.filter(
                    record => now - record.timestamp < windowMs
                ).length;

                // Track timestamps
                for (const record of userRecords) {
                    if (record.timestamp < oldestTimestamp) {
                        oldestTimestamp = record.timestamp;
                    }
                    if (record.timestamp > newestTimestamp) {
                        newestTimestamp = record.timestamp;
                    }
                }
            }
        }

        return {
            totalCorrections,
            recentCorrections,
            channelsWithCorrections: Array.from(channelsWithCorrections),
            oldestCorrection: oldestTimestamp === Infinity ? undefined : new Date(oldestTimestamp),
            newestCorrection: newestTimestamp === 0 ? undefined : new Date(newestTimestamp)
        };
    }

    /**
     * Get correction statistics for a channel
     */
    getChannelStats(channelId: string): {
        totalCorrections: number;
        uniqueUsers: number;
        recentCorrections: number;
        oldestCorrection?: Date;
        newestCorrection?: Date;
    } {
        let totalCorrections = 0;
        let recentCorrections = 0;
        const uniqueUsers = new Set<string>();
        let oldestTimestamp = Infinity;
        let newestTimestamp = 0;

        const windowMs = this.settings.windowMinutes * 60 * 1000;
        const now = Date.now();

        for (const records of this.corrections.values()) {
            const channelRecords = records.filter(record => record.channelId === channelId);
            
            if (channelRecords.length > 0) {
                totalCorrections += channelRecords.length;
                
                // Count recent corrections and unique users
                for (const record of channelRecords) {
                    uniqueUsers.add(record.userId);
                    
                    if (now - record.timestamp < windowMs) {
                        recentCorrections++;
                    }

                    // Track timestamps
                    if (record.timestamp < oldestTimestamp) {
                        oldestTimestamp = record.timestamp;
                    }
                    if (record.timestamp > newestTimestamp) {
                        newestTimestamp = record.timestamp;
                    }
                }
            }
        }

        return {
            totalCorrections,
            uniqueUsers: uniqueUsers.size,
            recentCorrections,
            oldestCorrection: oldestTimestamp === Infinity ? undefined : new Date(oldestTimestamp),
            newestCorrection: newestTimestamp === 0 ? undefined : new Date(newestTimestamp)
        };
    }

    /**
     * Remove all correction records for a user
     */
    clearUserRecords(userId: string): number {
        let removedCount = 0;
        
        for (const [key, records] of this.corrections.entries()) {
            const filteredRecords = records.filter(record => record.userId !== userId);
            removedCount += records.length - filteredRecords.length;
            
            if (filteredRecords.length === 0) {
                this.corrections.delete(key);
            } else {
                this.corrections.set(key, filteredRecords);
            }
        }
        
        return removedCount;
    }

    /**
     * Remove all correction records for a channel
     */
    clearChannelRecords(channelId: string): number {
        let removedCount = 0;
        
        for (const [key, records] of this.corrections.entries()) {
            const filteredRecords = records.filter(record => record.channelId !== channelId);
            removedCount += records.length - filteredRecords.length;
            
            if (filteredRecords.length === 0) {
                this.corrections.delete(key);
            } else {
                this.corrections.set(key, filteredRecords);
            }
        }
        
        return removedCount;
    }

    /**
     * Update settings
     */
    updateSettings(newSettings: Partial<DuplicateSettings>): void {
        this.settings = { ...this.settings, ...newSettings };
        
        // Restart cleanup timer if interval changed
        if (newSettings.cleanupIntervalMinutes !== undefined) {
            this.stopCleanupTimer();
            this.startCleanupTimer();
        }
    }

    /**
     * Get current settings
     */
    getSettings(): DuplicateSettings {
        return { ...this.settings };
    }

    /**
     * Clear all records
     */
    clear(): void {
        this.corrections.clear();
    }

    /**
     * Get total number of tracked corrections
     */
    size(): number {
        return Array.from(this.corrections.values()).reduce(
            (total, records) => total + records.length, 
            0
        );
    }

    /**
     * Export all data for backup/debugging
     */
    exportData(): { [key: string]: CorrectionRecord[] } {
        const exported: { [key: string]: CorrectionRecord[] } = {};
        for (const [key, records] of this.corrections.entries()) {
            exported[key] = [...records];
        }
        return exported;
    }

    /**
     * Import data from backup
     */
    importData(data: { [key: string]: CorrectionRecord[] }): void {
        this.corrections.clear();
        for (const [key, records] of Object.entries(data)) {
            this.corrections.set(key, [...records]);
        }
    }

    // Private methods

    private getKey(channelId: string, userId: string): string {
        return `${channelId}:${userId}`;
    }

    private hashMessage(content: string): string {
        // Simple hash function for message content
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }

    private startCleanupTimer(): void {
        const intervalMs = this.settings.cleanupIntervalMinutes * 60 * 1000;
        
        this.cleanupInterval = setInterval(() => {
            this.cleanupOldRecords();
        }, intervalMs);
    }

    private stopCleanupTimer(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }

    private cleanupOldRecords(): void {
        const now = Date.now();
        const maxAgeMs = this.settings.windowMinutes * 60 * 1000 * 2; // Keep records for 2x the window
        let removedCount = 0;

        for (const [key, records] of this.corrections.entries()) {
            const filteredRecords = records.filter(
                record => now - record.timestamp < maxAgeMs
            );
            
            removedCount += records.length - filteredRecords.length;
            
            if (filteredRecords.length === 0) {
                this.corrections.delete(key);
            } else {
                this.corrections.set(key, filteredRecords);
            }
        }

        if (removedCount > 0) {
            console.log(`[DuplicateTracker] Cleaned up ${removedCount} old correction records`);
        }
    }

    /**
     * Cleanup when the tracker is no longer needed
     */
    destroy(): void {
        this.stopCleanupTimer();
        this.clear();
    }
}