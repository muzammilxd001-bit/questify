import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const DATA_FILE = join(process.cwd(), ".data", "quest-channels.json");
const SNOWFLAKE = /^\d{17,20}$/;

export function loadQuestChannels(file = DATA_FILE): Record<string, string> {
    try {
        const data: unknown = JSON.parse(readFileSync(file, "utf8"));
        if (
            !data ||
            typeof data !== "object" ||
            Array.isArray(data) ||
            Object.entries(data).some(
                ([guild, channel]) =>
                    !SNOWFLAKE.test(guild) ||
                    typeof channel !== "string" ||
                    !SNOWFLAKE.test(channel),
            )
        ) {
            throw new Error("Invalid quest channel configuration");
        }
        return data as Record<string, string>;
    } catch (error: any) {
        if (error.code === "ENOENT") return {};
        throw error;
    }
}

export function saveQuestChannel(
    channels: Record<string, string>,
    guildId: string,
    channelId: string,
    file = DATA_FILE,
): void {
    if (!SNOWFLAKE.test(guildId) || !SNOWFLAKE.test(channelId)) {
        throw new Error("Invalid guild or channel ID");
    }
    const next = { ...channels, [guildId]: channelId };
    mkdirSync(dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.tmp`;
    writeFileSync(temp, JSON.stringify(next, null, 2) + "\n", { mode: 0o600 });
    renameSync(temp, file);
    channels[guildId] = channelId;
}

export function questChannelNotice(
    channels: Record<string, string>,
    guildId: string | undefined,
    channelId: string,
): string | null {
    if (!guildId) return "Quest commands are only available in a server.";
    const allowed = channels[guildId];
    if (!allowed) return "No quest channel is set yet. Ask a server admin to use `/set channel`.";
    if (allowed !== channelId) return `Use quest commands in <#${allowed}>.`;
    return null;
}