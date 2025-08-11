import os, json, asyncio, vdf, math

# The decky plugin module is located at decky-loader/plugin
# For easy intellisense checkout the decky-loader code repo
# and add the `decky-loader/plugin/imports` path to `python.analysis.extraPaths` in `.vscode/settings.json`
import decky

settings_dir = os.environ["DECKY_PLUGIN_SETTINGS_DIR"]
settings_file = os.path.join(settings_dir, "modecky.json")

_32bit_limit = math.pow(2, 32)


def ensure_settings_exists():
    if not os.path.exists(settings_file):
        with open(settings_file, 'w') as file:
            data = {}
            file.write(json.dumps(data))
            file.close()


class Plugin:
    # Asyncio-compatible long-running code, executed in a task when the plugin is loaded
    # async def _main(self):
    #     decky.logger.info("Hello World!")

    # Function called first during the unload process, utilize this to handle your plugin being stopped, but not
    # completely removed
    async def _unload(self):
        decky.logger.info("Goodnight World!")

    # Function called after `_unload` during uninstall, utilize this to clean up processes and other remnants of your
    # plugin that may remain on the system
    async def _uninstall(self):
        decky.logger.info("Goodbye World!")

    # Migrations that should be performed before entering `_main()`.
    async def _migration(self):
        decky.logger.info("Migrating")
        # Here's a migration example for logs:
        # - `~/.config/decky-template/template.log` will be migrated to `decky.decky_LOG_DIR/template.log`
        # decky.migrate_logs(os.path.join(decky.DECKY_USER_HOME,
        #                                        ".config", "decky-template", "template.log"))
        # # Here's a migration example for settings:
        # # - `~/homebrew/settings/template.json` is migrated to `decky.decky_SETTINGS_DIR/template.json`
        # # - `~/.config/decky-template/` all files and directories under this root are migrated to `decky.decky_SETTINGS_DIR/`
        # decky.migrate_settings(
        #     os.path.join(decky.DECKY_HOME, "settings", "template.json"),
        #     os.path.join(decky.DECKY_USER_HOME, ".config", "decky-template"))
        # # Here's a migration example for runtime data:
        # # - `~/homebrew/template/` all files and directories under this root are migrated to `decky.decky_RUNTIME_DIR/`
        # # - `~/.local/share/decky-template/` all files and directories under this root are migrated to `decky.decky_RUNTIME_DIR/`
        # decky.migrate_runtime(
        #     os.path.join(decky.DECKY_HOME, "template"),
        #     os.path.join(decky.DECKY_USER_HOME, ".local", "share", "decky-template"))

    async def find_non_steam_game_name(self, appid: int) -> str:
        userdata_dir = os.path.expanduser("~/.local/share/Steam/userdata/")
        appid_str = str(appid)

        for user in os.listdir(userdata_dir):
            shortcuts_path = os.path.join(
                userdata_dir,
                user,
                "config/shortcuts.vdf"
            )

            with open(shortcuts_path, 'rb') as file:
                shortcuts = vdf.binary_load(file)
                shortcuts = shortcuts["shortcuts"]

                for _, shortcut in shortcuts.items():
                    found_appid = shortcut.get("appid", "")
                    if appid_str in str(found_appid if found_appid > 0 else (_32bit_limit + found_appid)):
                        return str(shortcut.get("AppName", ""))

        return "NO GAME"
    
    async def is_game_managed(self, appid: int) -> bool:
        ensure_settings_exists()

        with open(settings_file, 'r') as file:
            data = json.load(file)
            file.close()

            return str(appid) in data.keys()
    
    async def manage_game(self, appid: int, game_name: str, game_path: str) -> None:
        ensure_settings_exists()

        data = {}
        with open(settings_file, 'r') as file:
            data = json.load(file)
            file.close()
        
        data[str(appid)] = {
            "name": game_name,
            "path": game_path
        }
        data = json.dumps(data)
        
        with open(settings_file, 'w') as file:
            file.seek(0)
            file.write(data)
            file.close()
    
    async def unmanage_game(self, appid: int) -> None:
        ensure_settings_exists()

        data = {}
        with open(settings_file, 'r') as file:
            data = json.load(file)
            file.close()
        
        data.pop(str(appid), None)
        data = json.dumps(data)

        with open(settings_file, 'w') as file:
            file.seek(0)
            file.write(data)
            file.close()
    
    async def get_managed_game_install_path(self, appid: int) -> str:
        ensure_settings_exists()

        with open(settings_file, 'r') as file:
            data = json.load(file)
            game = data.get(str(appid), None)

            if game:
                return game.get("path")
            file.close()
        
        return ""
