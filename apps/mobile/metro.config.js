const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch all files in the monorepo
config.watchFolders = [workspaceRoot];

// 2. Let Metro know where to resolve packages and force single instances
config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, "node_modules"),
    path.resolve(workspaceRoot, "node_modules"),
];

// Pre-resolve core libraries to their canonical physical paths 
// This avoids the 'SHA-1' error by pointing directly to the physical files under .pnpm
let coreModules = {};
try {
    coreModules = {
        react: require.resolve("react", { paths: [projectRoot] }),
        "react-dom": require.resolve("react-dom", { paths: [projectRoot] }),
        "@tanstack/react-query": require.resolve("@tanstack/react-query", { paths: [projectRoot] }),
    };
} catch (e) {
    console.warn("Metro config: Could not pre-resolve core modules", e.message);
}

// Force specific packages to resolve to the app's node_modules to avoid duplicates
config.resolver.extraNodeModules = {
    react: coreModules.react ? path.dirname(coreModules.react) : path.resolve(projectRoot, "node_modules/react"),
    "@tanstack/react-query": coreModules["@tanstack/react-query"] ? path.dirname(coreModules["@tanstack/react-query"]) : path.resolve(projectRoot, "node_modules/@tanstack/react-query"),
};

// Definitive fix for monorepo resolution: force all instances of react and react-query 
// to resolve to the app's local node_modules, regardless of where the import comes from.
config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (coreModules[moduleName]) {
        return {
            filePath: coreModules[moduleName],
            type: "sourceFile",
        };
    }
    return context.resolveRequest(context, moduleName, platform);
};

// Block local node_modules in shared packages to prevent duplication
// We use a direct RegExp to avoid problematic 'exclusionList' imports
config.resolver.blacklistRE = /.*\/packages\/shared\/node_modules\/(react|@tanstack\/react-query)\/.*/;

module.exports = withNativeWind(config, { input: "./global.css" });
