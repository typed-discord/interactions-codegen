# About
Generates strongly typed dispatchers from your bot's commands for use with [@typed-discord/interactions](https://typed-discord.github.io/interactions/).

> Check out the [demo](https://github.com/typed-discord/demo) to get started.

⚠️ This project is in its initial release phase and breaking changes may occur at any time.

# Generation
You can generate the dispatchers from your bot's commands using either the API or the CLI.

## Using the API
Here is an example of how to fetch your bot commands and generate dispatchers from them using the API:

```typescript
import { createAndPrintDispatchersSourceFile } from "@typed-discord/interactions-codegen";
import { Bot } from "@typed-discord/rest/clients";

const bot = new Bot(token);
const commands = await bot.listApplicationCommands(application_id);

createAndPrintDispatchersSourceFile("src/dispatchers.mts", commands!);
```

> You can pass both global and/or guild commands to `createAndPrintDispatchersSourceFile`.

## Using the CLI
You can also use the CLI with your bot token to generate the file directly:

```shell
npx @typed-discord/interactions-codegen --token "your-bot-token" --out "src/dispatchers.mts"
```

# Consuming the generated file
Import the generated file, implement your handlers, and pass the dispatchers to the router.

> You don't have to implement all of the dispatchers, only the ones you want to use.

```typescript
import { createRouter } from "@typed-discord/interactions/router";
import * as Dispatchers from "./dispatchers.mts";

const router = createRouter({
  onGlobalSlashCommand: Dispatchers.createGlobalSlashCommandDispatcher({
    // Global slash commands go here.
  }),
  onGuildSlashCommand: Dispatchers.createGuildSlashCommandDispatcher({
    // Guild slash commands go here.
  }),
  onGlobalUserCommand: Dispatchers.createGlobalUserCommandDispatcher({
    // Global user commands go here.
  }),
  onGuildUserCommand: Dispatchers.createGuildUserCommandDispatcher({
    // Guild user commands go here.
  }),
  onGlobalMessageCommand: Dispatchers.createGlobalMessageCommandDispatcher({
    // Global message commands go here.
  }),
  onGuildMessageCommand: Dispatchers.createGuildMessageCommandDispatcher({
    // Guild message commands go here.
  }),
  onGlobalAutocomplete: Dispatchers.createGlobalAutocompleteCommandDispatcher({
    // Global autocomplete commands go here.
  }),
  onGuildAutocomplete: Dispatchers.createGuildAutocompleteCommandDispatcher({
    // Guild autocomplete commands go here.
  })
});
```

Check the [@typed-discord/interactions documentation](https://typed-discord.github.io/interactions/) to learn how to use the router properly.
