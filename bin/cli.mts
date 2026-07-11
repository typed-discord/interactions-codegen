#!/usr/bin/env node

import { Command } from "commander";
import { Bot } from "@typed-discord/rest/clients";

import { createAndPrintDispatchersSourceFile } from "../src/index.mts";

new Command()
    .name('readfile')
    .requiredOption('-o, --out <file>', 'Output file', "dispatchers.mts")
    .requiredOption('-t, --token <token>', 'Discord bot token')
    .action(async (options) => {
        const bot = new Bot(options.token);
        const application = await bot.getMyApplication();
        const commands = await bot.listApplicationCommands(application.id);
        createAndPrintDispatchersSourceFile(options.out, commands!);
    })
    .parseAsync();
