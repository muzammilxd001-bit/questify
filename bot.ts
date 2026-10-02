import {
    GatewayDispatchEvents,
    GatewayIntentBits,
    InteractionType,
    ApplicationCommandOptionType,
    ApplicationCommandType,
    ComponentType,
    ButtonStyle,
    TextInputStyle,
    ChannelType,
    PermissionFlagsBits,
} from "discord-api-types/v10";
import { Client } from "@discordjs/core";
import { REST } from "@discordjs/rest";
import { WebSocketManager } from "@discordjs/ws";
import { runQuestsForToken, fetchQuestsStatus } from "./src/questRunner";
import type { Quest, QuestStatusInfo } from "./src/questRunner";
import { loadQuestChannels, questChannelNotice, saveQuestChannel } from "./src/questChannels";

const BOT_TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!BOT_TOKEN) {
    console.error("BOT_TOKEN is required.");
    process.exit(1);
}
if (!CLIENT_ID) {
    console.error("CLIENT_ID is required.");
    process.exit(1);
}

const PREFIX = "!quest";
const questChannels = loadQuestChannels();
const BRAND_COLOR = 0x735cff;

const INTENTS =
    GatewayIntentBits.Guilds |
    GatewayIntentBits.GuildMessages |
    GatewayIntentBits.MessageContent |
    GatewayIntentBits.DirectMessages;

const rest = new REST({ version: "10" }).setToken(BOT_TOKEN);
const gateway = new WebSocketManager({
    token: BOT_TOKEN,
    intents: INTENTS,
    rest,
});
const client = new Client({ rest, gateway });

// ── Custom IDs ────────────────────────────────────────────────────────────────
const BTN_RUN = "quest_run_btn";
const BTN_STATUS = "quest_status_btn";
const BTN_HELP = "quest_help_btn";
const MODAL_RUN = "quest_run_modal";
const MODAL_STATUS = "quest_status_modal";
const INPUT_TOKEN = "user_token_input";

// ── Helpers ───────────────────────────────────────────────────────────────────
const TASK_LABELS: Record<string, string> = {
    WATCH_VIDEO: "📺 Watch Video",
    WATCH_VIDEO_ON_MOBILE: "📱 Watch Video on Mobile",
    PLAY_ON_DESKTOP: "🖥️ Play on Desktop",
    PLAY_ON_XBOX: "🎮 Play on Xbox",
    PLAY_ON_PLAYSTATION: "🎮 Play on PlayStation",
    PLAY_ACTIVITY: "🎯 Play Activity",
    ACHIEVEMENT_IN_ACTIVITY: "🏆 Achievement",
    STREAM_ON_DESKTOP: "📡 Stream on Desktop",
};

function makeBar(pct: number, len = 12): string {
    const filled = Math.round((pct / 100) * len);
    return "█".repeat(filled) + "░".repeat(len - filled);
}

// ── "Token Required" embed + buttons ─────────────────────────────────────────
function buildTokenRequiredEmbed() {
    return {
        embeds: [
            {
                color: BRAND_COLOR,
                author: { name: "QUEST CONTROL  /  DASHBOARD" },
                title: "✦ Your quest hub",
                description:
                    "Everything you need, right here. Pick an action below to get started.\n" +
                    "━━━━━━━━━━━━━━━━━━━━━━━━━━",
                fields: [
                    {
                        name: "01  ·  Run quests",
                        value: "Start a run using the private token popup.",
                        inline: false,
                    },
                    {
                        name: "02  ·  Check status",
                        value: "See progress, rewards and time remaining.",
                        inline: false,
                    },
                    {
                        name: "03  ·  Need help?",
                        value:
                            "Open the guide for commands and safety tips.",
                        inline: false,
                    },
                ],
                footer: { text: "QUEST CONTROL  •  Never post a token publicly" },
                timestamp: new Date().toISOString(),
            },
        ],
        components: [
            {
                type: ComponentType.ActionRow,
                components: [
                    {
                        type: ComponentType.Button,
                        style: ButtonStyle.Primary,
                        custom_id: BTN_RUN,
                        label: "Run Quests",
                        emoji: { name: "▶️" },
                    },
                    {
                        type: ComponentType.Button,
                        style: ButtonStyle.Secondary,
                        custom_id: BTN_STATUS,
                        label: "Check Status",
                        emoji: { name: "📋" },
                    },
                    {
                        type: ComponentType.Button,
                        style: ButtonStyle.Secondary,
                        custom_id: BTN_HELP,
                        label: "Help",
                        emoji: { name: "❔" },
                    },
                ],
            },
        ],
    };
}

function buildHelpEmbed() {
    return {
        embeds: [
            {
                color: BRAND_COLOR,
                author: { name: "QUEST CONTROL  /  GUIDE" },
                title: "✦ Command guide",
                description:
                    "Your quick reference for everything Quest Control.\n━━━━━━━━━━━━━━━━━━━━━━━━━━",
                fields: [
                    {
                        name: "Slash commands",
                        value:
                            "`/set channel [#channel]` — admin: choose the quest channel\n" +
                            "`/quest-help` — open this guide\n" +
                            "`/quest-ping` — check connectivity\n" +
                            "`/quest-status` — view quest progress\n" +
                            "`/run-quests` — start a quest run",
                        inline: false,
                    },
                    {
                        name: "Prefix commands",
                        value:
                            "`!quest` — open the control center\n" +
                            "`!quest help` — open this guide\n" +
                            "`!quest status <token>` — legacy status command (not recommended)",
                        inline: false,
                    },
                    {
                        name: "What the bot reports",
                        value:
                            "Progress, completion state, rewards, expiry time, rate limits, and authentication errors are shown as clearly as Discord allows.",
                        inline: false,
                    },
                    {
                        name: "🔒 Safety first",
                        value:
                            "Never share your user token in a public message. User-token automation may violate Discord's rules and put your account at risk.",
                        inline: false,
                    },
                ],
                footer: { text: "QUEST CONTROL  •  Help center" },
                timestamp: new Date().toISOString(),
            },
        ],
    };
}

function buildPingEmbed() {
    return {
        embeds: [
            {
                color: 0x57f287,
                author: { name: "QUEST CONTROL  /  SYSTEM" },
                title: "✦ All systems online",
                description:
                    "The bot is connected and ready to receive commands.",
                fields: [
                    {
                        name: "Status",
                        value: "🟢 Operational",
                        inline: true,
                    },
                    {
                        name: "Commands",
                        value: "Use `/quest-help` to begin",
                        inline: true,
                    },
                ],
                footer: { text: "QUEST CONTROL  •  System status" },
                timestamp: new Date().toISOString(),
            },
        ],
    };
}

// ── Token modal ───────────────────────────────────────────────────────────────
function buildTokenModal(customId: string, title: string) {
    return {
        title,
        custom_id: customId,
        components: [
            {
                type: ComponentType.ActionRow,
                components: [
                    {
                        type: ComponentType.TextInput,
                        style: TextInputStyle.Short,
                        custom_id: INPUT_TOKEN,
                        label: "Your Discord user token",
                        placeholder:
                            "Paste your token here — it starts with your ID",
                        required: true,
                        min_length: 20,
                    },
                ],
            },
        ],
    };
}

// ── Build "Quest Complete" embed ──────────────────────────────────────────────
function buildCompleteEmbed(quest: Quest) {
    const cfg = quest.config;
    const questName = cfg.messages.quest_name;
    const gameTitle = cfg.messages.game_title;
    const publisher = cfg.messages.game_publisher;
    const appId = cfg.application.id;
    const color =
        parseInt((cfg.colors?.primary ?? "#57F287").replace("#", ""), 16) ||
        0x57f287;

    const tasks = cfg.task_config_v2?.tasks ?? {};
    const taskLines = Object.entries(tasks)
        .map(
            ([k, v]: [string, any]) =>
                `${TASK_LABELS[k] ?? k} • ${Math.ceil((v?.target ?? 0) / 60)} min ✓`,
        )
        .join("\n");

    const expiresAt = new Date(cfg.expires_at);
    const expiresUnix = Math.floor(expiresAt.getTime() / 1000);
    const daysLeft = Math.max(
        0,
        Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000),
    );

    const rewards = cfg.rewards_config?.rewards ?? [];
    const rewardLines = (rewards as any[])
        .map((r: any) =>
            r.orb_quantity
                ? `${r.orb_quantity} Orbs ✦ (${r.messages?.name ?? ""})`
                : (r.messages?.name ?? ""),
        )
        .join("\n");

    const gameTile = cfg.assets?.game_tile;
    const thumbnail = gameTile
        ? {
              url: `https://media.discordapp.net/app-assets/${appId}/store/${gameTile}.png`,
          }
        : undefined;

    const embed: any = {
        color,
        title: "✦ Quest Complete",
        description: `**${questName}**\n*${gameTitle} • ${publisher}*`,
        fields: [
            { name: "📋 Task", value: taskLines || "Unknown", inline: false },
            {
                name: "📅 Expires",
                value: `<t:${expiresUnix}:R> (${daysLeft}d left)`,
                inline: true,
            },
            {
                name: "📊 Progress",
                value: `\`${makeBar(100)}\`  100% — Done!`,
                inline: true,
            },
        ],
        footer: { text: "Quest Control • Completion report" },
        timestamp: new Date().toISOString(),
    };
    if (rewardLines)
        embed.fields.push({
            name: "🎁 Reward",
            value: rewardLines,
            inline: false,
        });
    if (thumbnail) embed.thumbnail = thumbnail;
    return embed;
}

// ── Build "Quest Status" embed (one per quest) ────────────────────────────────
function buildStatusEmbed(info: QuestStatusInfo) {
    const color = parseInt(info.colorHex, 16) || 0x5865f2;
    const taskLabel = TASK_LABELS[info.taskName] ?? info.taskName;
    const targetMins = Math.ceil(info.targetSeconds / 60);
    const doneMins = Math.ceil(info.doneSeconds / 60);
    const bar = makeBar(info.progressPct);
    const expiresUnix = Math.floor(info.expiresAt.getTime() / 1000);
    const daysLeft = Math.max(
        0,
        Math.ceil((info.expiresAt.getTime() - Date.now()) / 86_400_000),
    );

    const statusIcon = info.isCompleted ? "✅" : info.isEnrolled ? "🔄" : "🆕";
    const statusText = info.isCompleted
        ? "Completed"
        : info.isEnrolled
          ? "In Progress"
          : "Not Enrolled";

    const rewardText = info.orbQuantity
        ? `${info.orbQuantity} Orbs ✦ (${info.rewardName})`
        : info.rewardName;

    const thumbnail = info.gameTileAsset
        ? {
              url: `https://media.discordapp.net/app-assets/${info.appId}/store/${info.gameTileAsset}.png`,
          }
        : undefined;

    const embed: any = {
        color,
        title: `${statusIcon} ${info.name}`,
        description: `*${info.gameTitle} • ${info.publisher}*`,
        fields: [
            {
                name: "📋 Task",
                value: `${taskLabel} • ${targetMins} min`,
                inline: false,
            },
            {
                name: "📊 Progress",
                value: `\`${bar}\`  ${info.progressPct}% (${doneMins}/${targetMins} min) — ${statusText}`,
                inline: false,
            },
            {
                name: "📅 Expires",
                value: `<t:${expiresUnix}:R> (${daysLeft}d left)`,
                inline: true,
            },
            { name: "🎁 Reward", value: rewardText, inline: true },
        ],
        footer: { text: "Quest Control • Live status" },
        timestamp: new Date().toISOString(),
    };
    if (thumbnail) embed.thumbnail = thumbnail;
    return embed;
}

// ── Format error messages ─────────────────────────────────────────────────────
function formatError(err: string): string {
    const blockedMatch = err.match(/blocked until (.+?)\.?$/i);
    if (blockedMatch) {
        const unixTs = Math.floor(new Date(blockedMatch[1]).getTime() / 1000);
        if (!isNaN(unixTs)) {
            return `🚫 **Quest enrollment blocked!**\nDiscord ne temporarily block kar diya hai.\n\n**Unblock hoga:** <t:${unixTs}:F> (<t:${unixTs}:R>)`;
        }
    }
    if (
        /401|unauthorized/i.test(err) ||
        /invalid.*token|token.*invalid/i.test(err)
    ) {
        return [
            "🔑 **Invalid or expired token!**",
            "The token is incorrect or has expired.",
            "",
            "**How to get a token?**",
            "Check tutorials given in the channel.",
        ].join("\n");
    }
    if (/token is required/i.test(err)) {
        return "❌ **did not give token!** Command ke saath apna Discord token do.";
    }
    if (/rate.?limit/i.test(err)) {
        return "⏱️ **Rate limited!** Discord ne temporarily block kar diya — thodi der baad try karo.";
    }
    return `❌ **Error:** \`${err}\``;
}

// ── Send quest complete embed ─────────────────────────────────────────────────
async function sendQuestEmbed(channelId: string, quest: Quest) {
    await rest
        .post(`/channels/${channelId}/messages` as any, {
            body: { embeds: [buildCompleteEmbed(quest)] },
        })
        .catch((e: any) =>
            console.error("Failed to send quest embed:", e.message),
        );
}

// ── Send status embeds ────────────────────────────────────────────────────────
async function sendStatusEmbeds(
    channelId: string,
    token: string,
    mentionUser?: string,
) {
    const working = (await rest
        .post(`/channels/${channelId}/messages` as any, {
            body: {
                content: `${mentionUser ? `<@${mentionUser}> ` : ""}⏳ Quest status fetch ho rahi hai...`,
            },
        })
        .catch(() => null)) as any;

    const { quests, error } = await fetchQuestsStatus(token);

    if (error) {
        await rest
            .patch(`/channels/${channelId}/messages/${working?.id}` as any, {
                body: {
                    content: `${mentionUser ? `<@${mentionUser}> ` : ""}${formatError(error)}`,
                },
            })
            .catch(() => {});
        return;
    }

    if (working?.id) {
        await rest
            .delete(`/channels/${channelId}/messages/${working.id}` as any)
            .catch(() => {});
    }

    if (quests.length === 0) {
        await rest
            .post(`/channels/${channelId}/messages` as any, {
                body: {
                    content: `${mentionUser ? `<@${mentionUser}> ` : ""}😴 Koi active quest nahi mili!`,
                },
            })
            .catch(() => {});
        return;
    }

    await rest
        .post(`/channels/${channelId}/messages` as any, {
            body: {
                content: `${mentionUser ? `<@${mentionUser}> ` : ""}📋 **${quests.length} quest(s) mili — current status:**`,
            },
        })
        .catch(() => {});

    for (const info of quests) {
        await rest
            .post(`/channels/${channelId}/messages` as any, {
                body: { embeds: [buildStatusEmbed(info)] },
            })
            .catch(() => {});
    }
}

// ── Register slash commands ───────────────────────────────────────────────────
async function registerCommands() {
    await rest.put(`/applications/${CLIENT_ID}/commands` as any, {
        body: [
            {
                name: "run-quests",
                description:
                    "Auto-complete your Discord quests using your user token",
                options: [
                    {
                        name: "token",
                        description:
                            "Your Discord user token (reply is private)",
                        type: ApplicationCommandOptionType.String,
                        required: true,
                    },
                ],
            },
            {
                name: "quest-status",
                description:
                    "Check your active quests and progress without completing them",
                options: [
                    {
                        name: "token",
                        description:
                            "Your Discord user token (reply is private)",
                        type: ApplicationCommandOptionType.String,
                        required: true,
                    },
                ],
            },
            {
                name: "quest-help",
                description: "Open the Quest Bot command and safety guide",
            },
            {
                name: "quest-ping",
                description: "Check whether the Quest Bot is online",
            },
            {
                name: "set",
                description: "Configure Quest Control for this server",
                dm_permission: false,
                default_member_permissions: PermissionFlagsBits.ManageGuild.toString(),
                options: [
                    {
                        name: "channel",
                        description: "Choose the only channel where quest commands work",
                        type: ApplicationCommandOptionType.Subcommand,
                        options: [
                            {
                                name: "target",
                                description: "Channel to use (defaults to this channel)",
                                type: ApplicationCommandOptionType.Channel,
                                channel_types: [ChannelType.GuildText],
                                required: false,
                            },
                        ],
                    },
                ],
            },
        ],
    });
    console.log(
        "Quest commands and /set channel registered globally.",
    );
}

// ── Core run + report helper ──────────────────────────────────────────────────
async function runAndReport(
    userToken: string,
    channelId: string,
    sendInitial: () => Promise<any>,
    editFinal: (content: string) => Promise<void>,
) {
    await sendInitial();

    const result = await runQuestsForToken(userToken, (quest) =>
        sendQuestEmbed(channelId, quest),
    ).catch((err: any) => ({
        output: "",
        error: err.message ?? String(err),
        questsFound: 0,
        questsCompleted: 0,
    }));

    let content: string;
    if (result.error) {
        content = formatError(result.error);
    } else if (result.questsFound === 0) {
        content = "😴 I don't have any active quests now!";
    } else {
        content = `✅ **${result.questsFound}** quest(s) mili — **${result.questsCompleted}** complete!`;
    }

    await editFinal(content.slice(0, 2000));
}

// ── Cooldown system ───────────────────────────────────────────────────────────
const COOLDOWN_MS = 60_000;
const activeUsers = new Set<string>();
const lastRunAt = new Map<string, number>();

function checkCooldown(userId: string): { blocked: boolean; reason?: string } {
    if (activeUsers.has(userId)) {
        return {
            blocked: true,
            reason: "⏳ Your quest is already running, wait!",
        };
    }
    const last = lastRunAt.get(userId);
    if (last) {
        const elapsed = Date.now() - last;
        if (elapsed < COOLDOWN_MS) {
            const left = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
            return {
                blocked: true,
                reason: `⏱️ Cooldown! **${left}s** baad try karo.`,
            };
        }
    }
    return { blocked: false };
}

function startRun(userId: string) {
    activeUsers.add(userId);
    lastRunAt.set(userId, Date.now());
}
function finishRun(userId: string) {
    activeUsers.delete(userId);
}

// ── Ready ─────────────────────────────────────────────────────────────────────
client.once(GatewayDispatchEvents.Ready, async ({ data }) => {
    console.log(`Bot logged in as @${data.user.username} (${data.user.id})`);
    await registerCommands().catch((e) =>
        console.error("Failed to register commands:", e.message),
    );
    console.log(`Prefix command: "${PREFIX}" → shows Link Token button`);
});

// ── Interactions (slash commands + buttons + modals) ──────────────────────────
client.on(
    GatewayDispatchEvents.InteractionCreate,
    async ({ data: interaction, api }) => {
        const channelId =
            (interaction as any).channel_id ?? interaction.channel?.id ?? "";
        const guildId = (interaction as any).guild_id as string | undefined;
        const userId =
            (interaction as any).member?.user?.id ??
            (interaction as any).user?.id ??
            "";
        const customId = (interaction.data as any)?.custom_id as string | undefined;
        const questInteraction =
            (interaction.type === InteractionType.MessageComponent &&
                [BTN_RUN, BTN_STATUS, BTN_HELP].includes(customId ?? "")) ||
            (interaction.type === InteractionType.ModalSubmit &&
                [MODAL_RUN, MODAL_STATUS].includes(customId ?? "")) ||
            (interaction.type === InteractionType.ApplicationCommand &&
                ["run-quests", "quest-status", "quest-help", "quest-ping"].includes(
                    (interaction.data as any)?.name,
                ));
        if (questInteraction) {
            const notice = questChannelNotice(questChannels, guildId, channelId);
            if (notice) {
                await api.interactions.reply(interaction.id, interaction.token, {
                    embeds: [{ color: BRAND_COLOR, title: "✦ Quest channel only", description: notice }],
                    flags: 64,
                });
                return;
            }
        }

        // ── Button clicks ─────────────────────────────────────────────────────────
        if (interaction.type === InteractionType.MessageComponent) {

            if (customId === BTN_RUN) {
                const cd = checkCooldown(userId);
                if (cd.blocked) {
                    await api.interactions.reply(
                        interaction.id,
                        interaction.token,
                        {
                            content: cd.reason!,
                            flags: 64,
                        },
                    );
                    return;
                }
                await api.interactions.createModal(
                    interaction.id,
                    interaction.token,
                    buildTokenModal(MODAL_RUN, "Run Quests") as any,
                );
                return;
            }

            if (customId === BTN_STATUS) {
                await api.interactions.createModal(
                    interaction.id,
                    interaction.token,
                    buildTokenModal(MODAL_STATUS, "Check Quest Status") as any,
                );
                return;
            }

            if (customId === BTN_HELP) {
                await api.interactions.reply(
                    interaction.id,
                    interaction.token,
                    {
                        ...(buildHelpEmbed() as any),
                        flags: 64,
                    },
                );
                return;
            }
            return;
        }

        // ── Modal submits ─────────────────────────────────────────────────────────
        if (interaction.type === InteractionType.ModalSubmit) {
            const components = (interaction.data as any)?.components as any[];
            const userToken =
                components?.[0]?.components?.[0]?.value?.trim() ?? "";

            if (!userToken) {
                await api.interactions.reply(
                    interaction.id,
                    interaction.token,
                    {
                        content: "❌ I did not get the token. Try again.",
                        flags: 64,
                    },
                );
                return;
            }

            // Modal: Check Status
            if (customId === MODAL_STATUS) {
                await api.interactions.defer(
                    interaction.id,
                    interaction.token,
                    { flags: 64 },
                );
                console.log(`[Modal status] started (user: ${userId})`);
                await sendStatusEmbeds(channelId, userToken);
                await api.interactions.editReply(
                    CLIENT_ID!,
                    interaction.token,
                    {
                        content: "📋 Status embeds sent above!",
                    },
                );
                return;
            }

            // Modal: Run Quests
            if (customId === MODAL_RUN) {
                const cd = checkCooldown(userId);
                if (cd.blocked) {
                    await api.interactions.reply(
                        interaction.id,
                        interaction.token,
                        {
                            content: cd.reason!,
                            flags: 64,
                        },
                    );
                    return;
                }

                await api.interactions.defer(
                    interaction.id,
                    interaction.token,
                    { flags: 64 },
                );
                const sendInitial = async () =>
                    api.interactions.editReply(CLIENT_ID!, interaction.token, {
                        content: "⏳ Quest processing has started...",
                    });
                const editFinal = async (c: string) =>
                    void (await api.interactions.editReply(
                        CLIENT_ID!,
                        interaction.token,
                        { content: c },
                    ));

                console.log(`[Modal run] started (user: ${userId})`);
                startRun(userId);
                try {
                    await runAndReport(
                        userToken,
                        channelId,
                        sendInitial,
                        editFinal,
                    );
                } finally {
                    finishRun(userId);
                }
                return;
            }
            return;
        }

        // ── Slash commands ────────────────────────────────────────────────────────
        if (interaction.type !== InteractionType.ApplicationCommand) return;
        const cmdData = interaction.data as any;
        if (cmdData?.type !== ApplicationCommandType.ChatInput) return;

        if (cmdData?.name === "set") {
            const perms = BigInt((interaction as any).member?.permissions ?? "0");
            if (
                !guildId ||
                !(perms & (PermissionFlagsBits.ManageGuild | PermissionFlagsBits.Administrator))
            ) {
                await api.interactions.reply(interaction.id, interaction.token, {
                    content: "Only a server admin with Manage Server permission can set the quest channel.",
                    flags: 64,
                });
                return;
            }
            const subcommand = cmdData.options?.find((o: any) => o.name === "channel");
            const selected = subcommand?.options?.find((o: any) => o.name === "target")?.value as string | undefined;
            const targetId = selected ?? channelId;
            const targetType = selected
                ? cmdData.resolved?.channels?.[selected]?.type
                : (interaction as any).channel?.type;
            if (!subcommand || targetType !== ChannelType.GuildText) {
                await api.interactions.reply(interaction.id, interaction.token, {
                    content: "Choose a regular text channel. Run `/set channel` inside one, or pass `target`.",
                    flags: 64,
                });
                return;
            }
            try {
                saveQuestChannel(questChannels, guildId, targetId);
                await api.interactions.reply(interaction.id, interaction.token, {
                    embeds: [{
                        color: BRAND_COLOR,
                        author: { name: "QUEST CONTROL  /  SETTINGS" },
                        title: "✦ Quest channel saved",
                        description: `Quest commands and panel actions now work only in <#${targetId}>.`,
                        footer: { text: "QUEST CONTROL  •  Server settings" },
                    }],
                    flags: 64,
                });
            } catch (error) {
                console.error("Could not save quest channel:", error);
                await api.interactions.reply(interaction.id, interaction.token, {
                    content: "Could not save the channel. Check the bot's data directory and try again.",
                    flags: 64,
                });
            }
            return;
        }

        if (cmdData?.name === "quest-help") {
            await api.interactions.reply(
                interaction.id,
                interaction.token,
                {
                    ...(buildHelpEmbed() as any),
                    flags: 64,
                },
            );
            return;
        }

        if (cmdData?.name === "quest-ping") {
            await api.interactions.reply(
                interaction.id,
                interaction.token,
                {
                    ...(buildPingEmbed() as any),
                    flags: 64,
                },
            );
            return;
        }

        const userToken: string | undefined = cmdData.options?.find(
            (o: any) => o.name === "token",
        )?.value;

        if (!userToken?.trim()) {
            await api.interactions.reply(interaction.id, interaction.token, {
                content: "❌ Token is required.",
                flags: 64,
            });
            return;
        }

        if (cmdData?.name === "quest-status") {
            await api.interactions.defer(interaction.id, interaction.token, {
                flags: 64,
            });
            console.log(`[Slash /quest-status] started`);
            await sendStatusEmbeds(channelId, userToken.trim());
            await api.interactions.editReply(CLIENT_ID!, interaction.token, {
                content: "📋 Status embeds sent above!",
            });
            return;
        }

        if (cmdData?.name === "run-quests") {
            const cd = checkCooldown(userId);
            if (cd.blocked) {
                await api.interactions.reply(
                    interaction.id,
                    interaction.token,
                    { content: cd.reason!, flags: 64 },
                );
                return;
            }
            await api.interactions.defer(interaction.id, interaction.token, {
                flags: 64,
            });
            const sendInitial = async () =>
                api.interactions.editReply(CLIENT_ID!, interaction.token, {
                    content: "⏳ Quest processing has started...",
                });
            const editFinal = async (c: string) =>
                void (await api.interactions.editReply(
                    CLIENT_ID!,
                    interaction.token,
                    { content: c },
                ));
            console.log(`[Slash /run-quests] started (user: ${userId})`);
            startRun(userId);
            try {
                await runAndReport(
                    userToken.trim(),
                    channelId,
                    sendInitial,
                    editFinal,
                );
            } finally {
                finishRun(userId);
            }
            return;
        }
    },
);

// ── Prefix: !quest → shows embed with buttons ─────────────────────────────────
client.on(
    GatewayDispatchEvents.MessageCreate,
    async ({ data: message, api }) => {
        if (message.author.bot) return;
        const raw = message.content?.trim() ?? "";
        if (!/^!quest(?:\s|$)/i.test(raw)) return;
        if (questChannelNotice(questChannels, message.guild_id, message.channel_id)) return;

        const args = raw.slice(PREFIX.length).trim();

        if (args.toLowerCase() === "help") {
            await api.channels.createMessage(message.channel_id, {
                ...(buildHelpEmbed() as any),
                message_reference: { message_id: message.id },
            });
            return;
        }

        // !quest status <token>  — legacy direct token support kept
        if (args.toLowerCase().startsWith("status ")) {
            const token = args.slice("status ".length).trim();
            if (!token) {
                await api.channels.createMessage(message.channel_id, {
                    content: "❌ I want a token: `!quest status <token>`",
                    message_reference: { message_id: message.id },
                });
                return;
            }
            await api.channels
                .deleteMessage(message.channel_id, message.id)
                .catch(() => {});
            console.log(
                `[Prefix status] started (channel: ${message.channel_id})`,
            );
            await sendStatusEmbeds(
                message.channel_id,
                token,
                message.author.id,
            );
            return;
        }

        // !quest <token>  — legacy direct token kept for power users
        if (args && args !== "help") {
            const userId = message.author.id;
            const cd = checkCooldown(userId);
            if (cd.blocked) {
                await api.channels.createMessage(message.channel_id, {
                    content: `<@${userId}> ${cd.reason}`,
                    message_reference: { message_id: message.id },
                });
                return;
            }

            const token = args;
            await api.channels
                .deleteMessage(message.channel_id, message.id)
                .catch(() => {});
            const sentMsg = await api.channels.createMessage(
                message.channel_id,
                {
                    content: `⏳ <@${userId}> ⏳ Quest processing has started...`,
                },
            );
            const editFinal = async (txt: string) => {
                await api.channels
                    .editMessage(message.channel_id, sentMsg.id, {
                        content: `<@${userId}> ${txt}`,
                    })
                    .catch(() => {});
            };
            console.log(`[Prefix run] started (user: ${userId})`);
            startRun(userId);
            try {
                await runAndReport(
                    token,
                    message.channel_id,
                    async () => {},
                    editFinal,
                );
            } finally {
                finishRun(userId);
            }
            return;
        }

        // !quest panel → show the control center
        await api.channels.createMessage(message.channel_id, {
            ...(buildTokenRequiredEmbed() as any),
            message_reference: { message_id: message.id },
        });
    },
);

// ── Error handling ────────────────────────────────────────────────────────────
process.on("unhandledRejection", (r) =>
    console.error("[Error] Unhandled Rejection:", r),
);
process.on("uncaughtException", (e) =>
    console.error("[Error] Uncaught Exception:", e.message),
);

gateway.connect();
