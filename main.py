import os, json, asyncio, vdf, math, random, shutil
from typing import Any
from os.path import isdir

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

    async def path_exists(self, path: str) -> bool:
        return os.path.exists(os.path.expanduser(path))

    async def get_user_dir(self) -> str:
        return os.path.expanduser("~/")

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


    async def manage_game(self, appid: int, game_name: str, game_path: str) -> None:
        if not os.path.isdir(game_path):
            return

        ensure_settings_exists()

        data = {}
        with open(settings_file, 'r') as file:
            data = json.load(file)

        if str(appid) in data.keys():
            old_modecky_folder = data.get(str(appid), {}).get("path", None)
            if old_modecky_folder:
                old_modecky_folder = os.path.join(old_modecky_folder, ".modecky")
                if os.path.isdir(old_modecky_folder):
                    os.rmdir(old_modecky_folder)

        data[str(appid)] = {
            "name": game_name,
            "path": game_path
        }

        data = json.dumps(data)
        with open(settings_file, 'w') as file:
            file.write(data)

        modecky_folder = os.path.join(game_path, ".modecky")
        os.mkdir(modecky_folder)

    async def unmanage_game(self, appid: int) -> None:
        ensure_settings_exists()

        data = {}
        with open(settings_file, 'r') as file:
            data = json.load(file)

        game_path = data.get(str(appid), {}).get("path", None)
        if game_path:
            modecky_path = os.path.join(game_path, ".modecky")
            shutil.rmtree(modecky_path)

        data.pop(str(appid), None)
        data = json.dumps(data)

        with open(settings_file, 'w') as file:
            file.write(data)


    def read_install_path(self, appid: int) -> str | None:
        ensure_settings_exists()

        with open(settings_file, 'r') as file:
            data = json.load(file)
            return data.get(str(appid), {}).get("path", None)

    async def get_managed_game_install_path(self, appid: int) -> str | None:
        return self.read_install_path(appid)

    async def scan_mods(self, appid: int) -> list[str]:
        game_path = self.read_install_path(appid)

        if not game_path:
            return []

        modecky_path = os.path.join(game_path, ".modecky")
        if not os.path.isdir(modecky_path):
            os.mkdir(modecky_path)

        return os.listdir(modecky_path)


    def read_profiles(self, appid: int) -> dict:
        game_path = self.read_install_path(appid)

        if not game_path:
            return {}
        
        modecky_path = os.path.join(game_path, ".modecky")
        if not os.path.isdir(modecky_path):
            return {}

        profiles_path = os.path.join(modecky_path, "modecky.profiles.json")

        profiles = {}
        if os.path.isfile(profiles_path):
            with open(profiles_path, 'r') as profiles_file:
                profiles = json.loads(profiles_file.read())
        
        return profiles
    
    def write_profiles(self, appid: int, profiles: dict) -> None:
        game_path = self.read_install_path(appid)

        if not game_path:
            return
        
        modecky_path = os.path.join(game_path, ".modecky")
        if not os.path.isdir(modecky_path):
            os.mkdir(modecky_path)
        
        profiles_path = os.path.join(modecky_path, "modecky.profiles.json")
        
        with open(profiles_path, 'w') as profiles_file:
            profiles_file.write(json.dumps(profiles))

    async def scan_profiles(self, appid: int) -> list[str]:
        profiles = self.read_profiles(appid)

        return profiles.get("profiles", [])

    async def get_active_profile(self, appid: int) -> str | None:
        profiles = self.read_profiles(appid)

        return profiles.get("active_profile", None)

    async def set_active_profile(self, appid: int, profile_name: str | None) -> None:
        profiles = self.read_profiles(appid)

        if not profile_name:
            profiles.pop("active_profile", None)

        if profile_name in profiles.get("profiles", []):
            profiles["active_profile"] = profile_name

        self.write_profiles(appid, profiles)
    
    async def create_profile(self, appid: int) -> str:
        profiles = self.read_profiles(appid)

        profile_id = ""
        for _ in range(32):
            c = random.randint(0, 2)

            if c == 0:
                profile_id += chr(random.randint(int('a'.encode()[0]), int('z'.encode()[0])))
            elif c == 1:
                profile_id += chr(random.randint(int('A'.encode()[0]), int('Z'.encode()[0])))
            elif c == 2:
                profile_id += chr(random.randint(int('0'.encode()[0]), int('9'.encode()[0])))

        if "profile_data" not in profiles.keys():
            profiles["profile_data"] = {}
        profiles["profile_data"][profile_id] = {
            "load_order": []
        }

        if "profiles" not in profiles:
            profiles["profiles"] = []
        profiles["profiles"].append(profile_id)

        self.write_profiles(appid, profiles)

        return profile_id
    
    async def rename_profile(self, appid: int, profile_name: str, new_name: str | None) -> None:
        profiles = self.read_profiles(appid)

        if "profiles" in profiles:
            profiles["profiles"].pop(profiles.get("profiles", []).index(profile_name))
            if new_name:
                profiles["profiles"].append(new_name)

        if new_name:
            profiles["profile_data"][new_name] = profiles.get("profile_data", {}).get(profile_name, {
                "load_order": []
            })

        profiles["profile_data"].pop(profile_name, None)

    async def get_profile_load_order(self, appid: int, profile_name: str) -> list[str]:
        profiles = self.read_profiles(appid)
        
        return profiles.get("profile_data", {}).get(profile_name, {}).get("load_order", [])
    
    async def set_profile_load_order(self, appid: int, profile_name: str, load_order: list[str]) -> None:
        profiles = self.read_profiles(appid)

        if profile_name in profiles.get("profile_data", {}):
            profiles["profile_data"][profile_name]["load_order"] = load_order
