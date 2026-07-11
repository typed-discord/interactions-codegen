import ts from "typescript";
import { ApplicationCommandOptionType, ApplicationCommandType, InteractionContextType } from "@typed-discord/rest/types";
import type { SnowflakeType, ApplicationCommandResponse, ApplicationCommandAttachmentOptionResponse, ApplicationCommandBooleanOptionResponse, ApplicationCommandChannelOptionResponse, ApplicationCommandIntegerOptionResponse, ApplicationCommandMentionableOptionResponse, ApplicationCommandNumberOptionResponse, ApplicationCommandRoleOptionResponse, ApplicationCommandStringOptionResponse, ApplicationCommandUserOptionResponse } from "@typed-discord/rest/types";

const factory = ts.factory;
const SyntaxKind = ts.SyntaxKind;

const {
    createArrayTypeNode,
    createIdentifier,
    createIntersectionTypeNode,
    createParameterDeclaration,
    createToken,
    createTypeReferenceNode,
    createKeywordTypeNode,
    createUnionTypeNode,
    createLiteralTypeNode,
    createStringLiteral,
    createNumericLiteral,
    createPropertySignature,
    createTypeLiteralNode,
    createImportDeclaration,
    createImportClause,
    //createNamedImports,
    //createImportSpecifier,
    createFunctionTypeNode,
    createModifier,
    createSourceFile,
    createMethodSignature,
    createTypeAliasDeclaration,
    createNamespaceImport,
    createQualifiedName
} = factory;

const isValidIdentifier = /^[\p{ID_Start}$_][\p{ID_Continue}$_]*$/u;

function getValidName(name: string): string | ts.StringLiteral {
    if (isValidIdentifier.test(name)) {
        return name;
    }
    else {
        return createStringLiteral(name);
    }
}

function attachJSDoc<T extends ts.Node>(node: T, text: string): T {
    return ts.addSyntheticLeadingComment(node, ts.SyntaxKind.MultiLineCommentTrivia, `*\n * ${text}\n `, true);
}

function attachOneLineComment<T extends ts.Node>(node: T, text: string): T {
    return ts.addSyntheticLeadingComment(node, ts.SyntaxKind.MultiLineCommentTrivia, ` ${text} `);
}

/**
 * Application command options that are not subcommands or subcommand groups.
 */
export type Option = ApplicationCommandAttachmentOptionResponse | ApplicationCommandBooleanOptionResponse | ApplicationCommandChannelOptionResponse | ApplicationCommandIntegerOptionResponse | ApplicationCommandMentionableOptionResponse | ApplicationCommandNumberOptionResponse | ApplicationCommandRoleOptionResponse | ApplicationCommandStringOptionResponse | ApplicationCommandUserOptionResponse;

/**
 * Group application commands by type.
 */
export type Group = {
    [Type in ApplicationCommandType]: ApplicationCommandResponse[];
}

function createGroup(): Group {
    return {
        [ApplicationCommandType.CHAT]: [],
        [ApplicationCommandType.USER]: [],
        [ApplicationCommandType.MESSAGE]: [],
        [ApplicationCommandType.PRIMARY_ENTRY_POINT]: []
    }
}

/*
class ImportManager {
    imported = new Set<string>;

    constructor() { }

    import(name: string) {
        this.imported.add(name);
        console.log(this.imported)
        return createTypeReferenceNode(name);
    }

    toImportDeclaration(name: string, isTypeOnly: boolean) {
        console.log(this.imported)
        return createImportDeclaration(undefined,
            createImportClause(
                isTypeOnly,
                undefined,
                createNamedImports([...this.imported.values()].map(imported => createImportSpecifier(false, undefined, createIdentifier(imported))))
            ),
            createStringLiteral(name),
            undefined
        )
    }
}
*/

class ModuleImportManager {
    identifier: ts.Identifier;

    constructor(name: string) {
        this.identifier = createIdentifier(name);
    }

    import(name: string, typeArguments?: readonly ts.TypeNode[]) {
        return createTypeReferenceNode(
            createQualifiedName(
                this.identifier,
                createIdentifier(name)
            ),
            typeArguments
        );
    }

    toImportDeclaration(name: string, isTypeOnly: boolean) {
        return createImportDeclaration(
            undefined,
            createImportClause(
                isTypeOnly,
                undefined,
                createNamespaceImport(this.identifier)
            ),
            createStringLiteral(name),
            undefined
        )
    }
}

const router = new ModuleImportManager("Router");
const restTypes = new ModuleImportManager("RestTypes");
const interactionsTypes = new ModuleImportManager("Types");

const stringKeywordType = createKeywordTypeNode(SyntaxKind.StringKeyword);
const numberKeywordType = createKeywordTypeNode(SyntaxKind.NumberKeyword);

const exportModifier = createModifier(ts.SyntaxKind.ExportKeyword);

/**
 * Creates the corresponding type for a given option.
 *
 * @param option The option.
 * @param resolved Whether the option should be resolved (slash command) or not (autocomplete).
 */
export function createOptionType(option: Option, resolved: boolean = false): ts.TypeNode {
    switch (option.type) {
        case ApplicationCommandOptionType.STRING:
            return option.choices ? createUnionTypeNode(option.choices.map(choice => attachOneLineComment(createLiteralTypeNode(createStringLiteral(choice.value)), choice.name))) : stringKeywordType;
        case ApplicationCommandOptionType.INTEGER:
            return option.choices ? createUnionTypeNode(option.choices.map(choice => attachOneLineComment(createLiteralTypeNode(createNumericLiteral(choice.value)), choice.name))) : numberKeywordType;
        case ApplicationCommandOptionType.BOOLEAN:
            return createKeywordTypeNode(SyntaxKind.BooleanKeyword);
        case ApplicationCommandOptionType.USER:
            return resolved ? createUnionTypeNode([interactionsTypes.import("User"), interactionsTypes.import("Member")]) : restTypes.import("SnowflakeType");
        case ApplicationCommandOptionType.CHANNEL:
            return resolved ? interactionsTypes.import("PartialChannel") : restTypes.import("SnowflakeType");
        case ApplicationCommandOptionType.ROLE:
            return resolved ? interactionsTypes.import("Role") : restTypes.import("SnowflakeType");
        case ApplicationCommandOptionType.MENTIONABLE:
            return resolved ? createUnionTypeNode([interactionsTypes.import("User"), interactionsTypes.import("Member"), interactionsTypes.import("Role")]) : restTypes.import("SnowflakeType");
        case ApplicationCommandOptionType.NUMBER:
            return option.choices ? createUnionTypeNode(option.choices.map(choice => attachOneLineComment(createLiteralTypeNode(createNumericLiteral(choice.value)), choice.name))) : numberKeywordType;
        case ApplicationCommandOptionType.ATTACHMENT:
            return resolved ? interactionsTypes.import("Attachment") : restTypes.import("SnowflakeType");
    }
}

/**
 * Creates the corresponding interaction type of a command based on its supported contexts.
 *
 * @param command The command.
 */
export function createInteractionType(command: ApplicationCommandResponse): ts.TypeNode {
    const contexts = command.guild_id ? [InteractionContextType.GUILD] : command.contexts ?? [InteractionContextType.GUILD, InteractionContextType.BOT_DM, InteractionContextType.PRIVATE_CHANNEL];
    const base = interactionsTypes.import("BaseInteraction");
    const contextType = createUnionTypeNode(contexts.map(context => {
        switch (context) {
            case InteractionContextType.GUILD:
                return interactionsTypes.import("GuildInteraction");
            case InteractionContextType.BOT_DM:
                return interactionsTypes.import("BotDirectMessageInteraction");
            case InteractionContextType.PRIVATE_CHANNEL:
                return interactionsTypes.import("PrivateMessageInteraction");
        }
    }));

    return createIntersectionTypeNode([base, contextType]);
}

/**
 * Creates a handler type for a slash command.
 *
 * @param interactionType The type of the interaction.
 * @param options The options.
 */
export function createSlashCommandHandler(interactionType: ts.TypeNode, options: Option[]): ts.FunctionTypeNode {
    const members = options.map(option => attachJSDoc(createPropertySignature([], getValidName(option.name), option.required ? undefined : createToken(ts.SyntaxKind.QuestionToken), createOptionType(option, true)), option.description));
    const optionsType = createTypeLiteralNode(members);

    return createFunctionTypeNode(undefined, [createParameterDeclaration([], undefined, "options", undefined, optionsType), createParameterDeclaration([], undefined, "interaction", undefined, interactionType)], router.import("ApplicationCommandResponse"));
}

/**
 * Creates a handler type for a slash command autocomplete.
 *
 * @param interactionType The type of the interaction.
 * @param options The options.
 */
export function createSlashCommandAutocompleteHandler(interactionType: ts.TypeNode, options: Option[]): ts.TypeLiteralNode {
    const autocompleteOptions = options.filter(option => "autocomplete" in option && option.autocomplete);

    const autocompleteHandlerType = createTypeLiteralNode(autocompleteOptions.map(option => {
        const valueParameter = createParameterDeclaration([], undefined, "value", undefined, stringKeywordType);
        const optionsParameterType = createTypeLiteralNode(options.filter(option2 => option !== option2).map(option => attachJSDoc(createPropertySignature([], getValidName(option.name), createToken(ts.SyntaxKind.QuestionToken), createOptionType(option)), option.description)));
        const optionsParameter = createParameterDeclaration([], undefined, "options", undefined, optionsParameterType);
        const choicesType = router.import("MayBePromise", [createArrayTypeNode(createTypeLiteralNode([
            createPropertySignature(
                undefined,
                "name",
                undefined,
                stringKeywordType
            ),
            createPropertySignature(
                undefined,
                "value",
                undefined,
                createOptionType(option)
            )
        ]))]);
        const interactionParameter = createParameterDeclaration([], undefined, "interaction", undefined, interactionType);

        return createPropertySignature([], getValidName(option.name), undefined, createFunctionTypeNode(undefined, [valueParameter, optionsParameter, interactionParameter], choicesType));
    }));

    return autocompleteHandlerType;
}

/**
 * Creates a handler type for a slash command, where subcommands and subcommand groups are represented as nested properties.
 *
 * @param createSlashCommandHandler The function used to create the handler type for a slash command.
 * @param interactionType The type of the interaction.
 * @param options The options, which may include subcommands and subcommand groups.
 */
export function createSlashCommandHandlerMapRec(createSlashCommandHandler: (interactionType: ts.TypeNode, options: Option[]) => ts.TypeNode, interactionType: ts.TypeNode, options: ApplicationCommandResponse["options"] = []): ts.TypeNode {
    const commands = options.filter(option => option.type === ApplicationCommandOptionType.SUB_COMMAND || option.type === ApplicationCommandOptionType.SUB_COMMAND_GROUP);

    if (commands.length > 0) {
        const subcommands = commands.map(option => attachJSDoc(createPropertySignature([], getValidName(option.name), undefined, createSlashCommandHandlerMapRec(createSlashCommandHandler, interactionType, option.options)), option.description));

        return createTypeLiteralNode(subcommands);
    }
    else {
        return createSlashCommandHandler(interactionType, options as Option[]);
    }
}

/**
 * Creates a type literal mapping slash command names to their handler types.
 *
 * @param createSlashCommandHandler The function used to create the handler type for a slash command.
 * @param commands The slash commands.
 */
export function createSlashCommandHandlerMap(createSlashCommandHandler: (interactionType: ts.TypeNode, options: Option[]) => ts.TypeNode, commands: ApplicationCommandResponse[]) {
    const members = commands.map(command => {
        const signature = createPropertySignature(undefined, getValidName(command.name), undefined, createSlashCommandHandlerMapRec(createSlashCommandHandler, createInteractionType(command), command.options));
        return attachJSDoc(signature, command.description);
    });

    return createTypeLiteralNode(members);
}

/**
 * Creates a type literal mapping user command names to their handler types.
 *
 * @param commands The user commands.
 */
export function createUserCommandHandlerMap(commands: ApplicationCommandResponse[]) {
    const members = commands.map(command => {
        const parameters = [createParameterDeclaration([], undefined, "user", undefined, createUnionTypeNode([interactionsTypes.import("Member"), interactionsTypes.import("User")])), createParameterDeclaration([], undefined, "interaction", undefined, createInteractionType(command))];
        const method = createMethodSignature(undefined, getValidName(command.name), undefined, undefined, parameters, router.import("ApplicationCommandResponse"));

        return method;
    });

    return createTypeLiteralNode(members);
}

/**
 * Creates a type literal mapping message command names to their handler types.
 *
 * @param commands The message commands.
 */
export function createMessageCommandHandlerMap(commands: ApplicationCommandResponse[]) {
    const members = commands.map(command => {
        const parameters = [createParameterDeclaration([], undefined, "message", undefined, interactionsTypes.import("PartialMessage")), createParameterDeclaration([], undefined, "interaction", undefined, createInteractionType(command))];
        const method = createMethodSignature(undefined, getValidName(command.name), undefined, undefined, parameters, router.import("ApplicationCommandResponse"));

        return method;
    });

    return createTypeLiteralNode(members);
}

/**
 * Creates a type literal mapping guild identifiers to their respective command handlers.
 *
 * @param guilds The guilds and their commands.
 * @param type The application command type to generate handlers for.
 * @param createCommandHandlersType The function used to create the dispatcher type for a list of commands.
 */
export function createGuildCommandHandlerMap(guilds: Map<SnowflakeType, Group>, type: ApplicationCommandType, createCommandHandlersType: (commands: ApplicationCommandResponse[]) => ts.TypeNode) {
    const members = [...guilds.entries()].map(([guild_id, { [type]: commands }]) => {
        return createPropertySignature(undefined, getValidName(guild_id), undefined, createCommandHandlersType(commands));
    });

    return createTypeLiteralNode(members);
}

/**
 * Creates the dispatcher source file from the provided application commands.
 *
 * @param commands The (global or guild) application commands used to generate the dispatchers.
 */
export function createDispatchersSourceFile(commands: ApplicationCommandResponse[]): ts.SourceFile {
    const global = createGroup();
    const guilds = new Map<SnowflakeType, Group>();

    for (const command of commands) {
        let guild;

        if (command.guild_id) {
            guild = guilds.get(command.guild_id);

            if (!guild) {
                guild = createGroup();
                guilds.set(command.guild_id, guild);
            }
        }
        else {
            guild = global;
        }

        guild[command.type].push(command);
    }

    const modifiers = [exportModifier];

    const globalSlashCommands = createTypeAliasDeclaration(modifiers, "GlobalSlashCommands", [], createSlashCommandHandlerMap(createSlashCommandHandler, global[ApplicationCommandType.CHAT]));
    const globalUserCommands = createTypeAliasDeclaration(modifiers, "GlobalUserCommands", [], createUserCommandHandlerMap(global[ApplicationCommandType.USER]));
    const globalMessageCommands = createTypeAliasDeclaration(modifiers, "GlobalMessageCommands", [], createMessageCommandHandlerMap(global[ApplicationCommandType.MESSAGE]));
    const globalSlashCommandsAutocomplete = createTypeAliasDeclaration(modifiers, "GlobalSlashCommandsAutocomplete", [], createSlashCommandHandlerMap(createSlashCommandAutocompleteHandler, global[ApplicationCommandType.CHAT]));

    const guildSlashCommands = createTypeAliasDeclaration(modifiers, "GuildSlashCommands", [], createGuildCommandHandlerMap(guilds, ApplicationCommandType.CHAT, commands => createSlashCommandHandlerMap(createSlashCommandHandler, commands)));
    const guildUserCommands = createTypeAliasDeclaration(modifiers, "GuildUserCommands", [], createGuildCommandHandlerMap(guilds, ApplicationCommandType.USER, createUserCommandHandlerMap));
    const guildMessageCommands = createTypeAliasDeclaration(modifiers, "GuildMessageCommands", [], createGuildCommandHandlerMap(guilds, ApplicationCommandType.MESSAGE, createMessageCommandHandlerMap));
    const guildSlashCommandsAutocomplete = createTypeAliasDeclaration(modifiers, "GuildSlashCommandsAutocomplete", [], createGuildCommandHandlerMap(guilds, ApplicationCommandType.CHAT, commands => createSlashCommandHandlerMap(createSlashCommandAutocompleteHandler, commands)));

    const restTypesImport = restTypes.toImportDeclaration("@typed-discord/rest/types", true);
    const routerTypesImport = router.toImportDeclaration("@typed-discord/interactions/router", true);
    const interactionsTypesImport = interactionsTypes.toImportDeclaration("@typed-discord/interactions/types", true);

    return createSourceFile([restTypesImport, routerTypesImport, interactionsTypesImport, globalSlashCommands, globalUserCommands, globalMessageCommands, globalSlashCommandsAutocomplete, guildSlashCommands, guildUserCommands, guildMessageCommands, guildSlashCommandsAutocomplete], createToken(ts.SyntaxKind.EndOfFileToken), ts.NodeFlags.None);
}

const staticCode = `
type Handler<Args extends unknown[], T> = (...args: Args) => T
type DispatchMap<Args extends unknown[], T> = {
    [key: string]: DispatchMap<Args, T>;
 } | Handler<Args, T>;

function callHandler<Args extends unknown[], R>(map: DispatchMap<Args, R>, path: string[], ...args: Args): R {
    const [key, ...next] = path;

    if (key === undefined) {
        if (typeof map === "function") {
            return map(...args);
        }
        else {
            throw new Error("Function expected.");
        }
    }
    else {
        if (typeof map === "object") {
            const newMap = map[key];

            if (newMap) return callHandler(newMap, next, ...args);
            else throw new Error("Subgroup not found.");
        }
        else {
            throw new Error("Subgroup expected.");
        }
    }
}

export function createGlobalSlashCommandDispatcher(onGlobalSlashCommand: GlobalSlashCommands): Router.Handlers["onGlobalSlashCommand"] {
   return (name, options, interaction) => callHandler(onGlobalSlashCommand as unknown as DispatchMap<[typeof options, typeof interaction], ReturnType<Router.Handlers["onGlobalSlashCommand"]>>, name.split(" "), options, interaction);
}

export function createGuildSlashCommandDispatcher(onGlobalSlashCommand: GuildSlashCommands): Router.Handlers["onGuildSlashCommand"] {
   return (guild_id, name, options, interaction) => callHandler(onGlobalSlashCommand as unknown as DispatchMap<[typeof options, typeof interaction], ReturnType<Router.Handlers["onGuildSlashCommand"]>>, [guild_id, ...name.split(" ")], options, interaction);
}

export function createGlobalUserCommandDispatcher(onGlobalUserCommand: GlobalUserCommands): Router.Handlers["onGlobalUserCommand"] {
   return (name, member_or_user, interaction) => callHandler(onGlobalUserCommand as unknown as DispatchMap<[typeof member_or_user, typeof interaction], ReturnType<Router.Handlers["onGlobalUserCommand"]>>, [name], member_or_user, interaction);
}

export function createGuildUserCommandDispatcher(onGuildUserCommand: GuildUserCommands): Router.Handlers["onGuildUserCommand"] {
   return (guild_id, name, member_or_user, interaction) => callHandler(onGuildUserCommand as unknown as DispatchMap<[typeof member_or_user, typeof interaction], ReturnType<Router.Handlers["onGuildUserCommand"]>>, [guild_id, name], member_or_user, interaction);
}

export function createGlobalMessageCommandDispatcher(onGlobalMessageCommand: GlobalMessageCommands): Router.Handlers["onGlobalMessageCommand"] {
   return (name, message, interaction) => callHandler(onGlobalMessageCommand as unknown as DispatchMap<[typeof message, typeof interaction], ReturnType<Router.Handlers["onGlobalMessageCommand"]>>, [name], message, interaction);
}

export function createGuildMessageCommandDispatcher(onGuildMessageCommand: GuildMessageCommands): Router.Handlers["onGuildMessageCommand"] {
   return (guild_id, name, message, interaction) => callHandler(onGuildMessageCommand as unknown as DispatchMap<[typeof message, typeof interaction], ReturnType<Router.Handlers["onGuildMessageCommand"]>>, [guild_id, name], message, interaction);
}

export function createGlobalAutocompleteCommandDispatcher(onGlobalAutocomplete: GlobalSlashCommandsAutocomplete): Router.Handlers["onGlobalAutocomplete"] {
   return (name, focusedOptionName, focusedOptionValue, notFocusedOptions, interaction) => callHandler(onGlobalAutocomplete as unknown as DispatchMap<[typeof focusedOptionValue, typeof notFocusedOptions, typeof interaction], ReturnType<Router.Handlers["onGlobalAutocomplete"]>>, [...name.split(" "), focusedOptionName], focusedOptionValue, notFocusedOptions, interaction);
}
   
export function createGuildAutocompleteCommandDispatcher(onGuildAutocomplete: GuildSlashCommandsAutocomplete): Router.Handlers["onGuildAutocomplete"] {
   return (guild_id, name, focusedOptionName, focusedOptionValue, notFocusedOptions, interaction) => callHandler(onGuildAutocomplete as unknown as DispatchMap<[typeof focusedOptionValue, typeof notFocusedOptions, typeof interaction], ReturnType<Router.Handlers["onGuildAutocomplete"]>>, [guild_id, ...name.split(" "), focusedOptionName], focusedOptionValue, notFocusedOptions, interaction);
}
`

/**
 * Creates and writes the dispatcher source file from the provided application commands.
 *
 * @param path The output path where the generated source file should be written.
 * @param commands The (global or guild) application commands used to generate the dispatchers.
 */
export function createAndPrintDispatchersSourceFile(path: string, commands: ApplicationCommandResponse[]) {
    const sourceFile = createDispatchersSourceFile(commands);
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    const code = printer.printFile(sourceFile);
    ts.sys.writeFile(path, `${code}\n\n${staticCode}`);
}
