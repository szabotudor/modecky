import {
  ButtonItem,
  PanelSection,
  PanelSectionRow,
  staticClasses,
  TextField
} from "@decky/ui";
import {
  callable,
  definePlugin,
  FileSelectionType,
  openFilePicker,
  toaster
} from "@decky/api"
import Logo from "../assets/xelu/Steam Deck/SteamDeck_Power.png";
import { useEffect, useState } from "react";


// CLASSES

class AppInfo {
  appid: number = -1;
  name: string = "none";
  install_folder: string = "/";

  constructor(appid: number, name: string, install_folder: string) {
    this.appid = appid;
    this.name = name;
    this.install_folder = install_folder;
  }
}


// PYTHON FUNCTIONS

const path_exists = callable<[path: string], boolean>("path_exists");
const get_user_dir = callable<[], string>("get_user_dir");
const manage_game = callable<[appid: number, game_name: string, game_path: string], void>("manage_game");
const unmanage_game = callable<[appid: number], void>("unmanage_game");
const find_non_steam_game_name = callable<[appid: number], string>("find_non_steam_game_name");
const get_managed_game_install_path = callable<[appid: number], string | null>("get_managed_game_install_path");

const scan_mods = callable<[appid: number], string[]>("scan_mods");
const scan_profiles = callable<[appid: number], string[]>("scan_profiles");
const get_active_profile = callable<[appid: number], string | null>("get_active_profile");
const set_active_profile = callable<[appid: number, profile_name: string | null], null>("set_active_profile");
const create_profile = callable<[appid: number], string>("create_profile");
const rename_profile = callable<[appid: number, profile_name: string, new_name: string | null], null>("rename_profile");
const get_profile_load_order = callable<[appid: number, profile_name: string], string[]>("get_profile_load_order");
const set_profile_load_order = callable<[appid: number, profile_name: string, load_order: string[]], null>("set_profile_load_order");

var profile_rename_cache: string = "";


// UTILITY FUNCTIONS

var setModeckyMenu: React.Dispatch<React.SetStateAction<JSX.Element | null>>;
var getModeckyMenu: () => JSX.Element | null;

async function findCurrentAppInfo(): Promise<AppInfo | null> {
  const url = Object.values(window).find(v => v.navigator)?.location.toString();
  const match = url?.match(/\/library\/app\/(\d+)/);
  const appid = match ? parseInt(match[1]) : null;

  if (!appid)
    return null;
  
  var [name, appfolder] = await new Promise<[string, string] | [null]>(async resolve => {
    SteamClient.InstallFolder.GetInstallFolders().then(folders => {
      folders.forEach(folder => folder.vecApps.forEach(app => {
        if (app.nAppID == appid)
          resolve([app.strAppName, folder.strFolderPath.concat("/steamapps/common/" + app.strAppName)]);
      }))
      resolve([null]);
    });
  })

  if (!name) {
    const non_steam_name = await new Promise<string | null>(async resolve => {
      find_non_steam_game_name(appid).then(game_name => resolve(game_name));
    });
    name = non_steam_name;
  }

  if (!name)
    return null;

  return new AppInfo(appid, name, appfolder ?? "NO PATH");
}


function browseForGame(app: AppInfo) {
  path_exists(app.install_folder).then(async path_is_valid =>
    openFilePicker(FileSelectionType.FOLDER, path_is_valid ? app.install_folder : await get_user_dir(), false, true).then(({path}) => {
      app.install_folder = path;
      manage_game(app.appid, app.name, path);
      showModdingMenu(app);
    })
  );
}

function confirmationMenu(text: JSX.Element, confirm_text: string, decline_text: string, confirm_action: () => void) {
  const current_menu = getModeckyMenu();

  setModeckyMenu(<PanelSection>
    <PanelSectionRow>
      <div className={staticClasses.Text}>{text}</div>
    </PanelSectionRow>

    <PanelSectionRow>
      <ButtonItem onClick={() => confirm_action()} layout="below">{confirm_text}</ButtonItem>
      <ButtonItem onClick={() => setModeckyMenu(current_menu)} layout="below">{decline_text}</ButtonItem>
    </PanelSectionRow>
  </PanelSection>)
}

function showProfileMenu(app: AppInfo, profile: string): void {
  setModeckyMenu(<PanelSection>
    <PanelSectionRow>
      <div className={staticClasses.Title}>{profile}</div>
    </PanelSectionRow>

    <PanelSectionRow>
      <TextField
      onChange={(event) => { profile_rename_cache = event.target.value; }}
      label="Profile Name"
      rangeMin={3}></TextField>

      <ButtonItem
      onClick={() => {
        if (profile_rename_cache.length >= 3) {
          rename_profile(app.appid, profile, profile_rename_cache).then(() =>
            set_active_profile(app.appid, profile_rename_cache).then(() =>
              showProfileMenu(app, profile_rename_cache)
            )
          );
        }
      }}
      layout="below">
        Rename
      </ButtonItem>
    </PanelSectionRow>

    <PanelSectionRow>
      <br/>
      <ButtonItem onClick={() => { set_active_profile(app.appid, null); showModdingMenu(app); }} layout="below">Stop Managing Mod</ButtonItem>
    </PanelSectionRow>

    <PanelSectionRow>
      <ButtonItem onClick={() => {
        confirmationMenu(
          <div>Are you sure?<br/>WARNING: This won't delete the mods in this profile, BUT it will delete all profile data permanently</div>,
          "Yes I'm sure",
          "Nevermind",
          () => rename_profile(app.appid, profile, null).then(() =>
            set_active_profile(app.appid, null).then(() =>
              showModdingMenu(app)
            )
          )
        )
      }} layout="below">
        <div style={{ color:'red' }}>DELETE PROFILE</div>
      </ButtonItem>
    </PanelSectionRow>
  </PanelSection>)
}

function showModdingMenu(app: AppInfo) {
  scan_mods(app.appid).then(mods => scan_profiles(app.appid).then(async profile_ids => {
    var mods_section: Array<JSX.Element> = [];
    var profiles_section: Array<JSX.Element> = [];

    mods.forEach(mod => {
      mods_section.push(<div className={staticClasses.Text}>{mod}</div>)
    });

    profile_ids.forEach(profile => {
      profiles_section.push(<ButtonItem label={profile} onClick={() => { set_active_profile(app.appid, profile); showProfileMenu(app, profile); }}>Manage</ButtonItem>);
    })

    setModeckyMenu(<PanelSection>
      <PanelSectionRow>
        <div className={staticClasses.Text}>Now modding "{app.name}" with appid {app.appid}</div>
        <br/>
      </PanelSectionRow>

      <PanelSectionRow>
        <div className={staticClasses.Title}>Installation path</div>
        <div className={staticClasses.Text}><br/>{app.install_folder}</div>
      </PanelSectionRow>

      <PanelSectionRow>
        <ButtonItem onClick={() => {browseForGame(app)}} layout="below">
          Browse
        </ButtonItem>
        <br/>
      </PanelSectionRow>

      <PanelSectionRow>
        <div className={staticClasses.Title}>Available mods:</div>
        <br/>
        {mods_section}
        <br/>
      </PanelSectionRow>

      <PanelSectionRow>
        <div className={staticClasses.Title}>Profiles:</div>
        <br/>
        {profiles_section}
        <br/>
      </PanelSectionRow>

      <PanelSectionRow>
        <ButtonItem onClick={() => { create_profile(app.appid); showModdingMenu(app); }} layout="below">
          Add Profile
        </ButtonItem>
      </PanelSectionRow>

      <PanelSectionRow>
          <ButtonItem onClick={() => confirmationMenu(
            <div>Are you sure?<br/>WARNING: This will delete all modding data and mods for this game</div>, "Yes I'm Sure", "Nevermind",
            () => {unmanage_game(app.appid).then(() => generateCurrentGameMenu(app));}
          )} layout="below">
            <div style={{ color:'red' }}>STOP MANAGING GAME</div>
          </ButtonItem>
        <br/>
      </PanelSectionRow>
    </PanelSection>)
  }))
}


// MENUS

function generateCurrentGameMenu(app: AppInfo | null) {
  if (!app || !app.appid) {
    setModeckyMenu(<PanelSection>
      <PanelSectionRow>
        <div className={staticClasses.Text}>Select a game in your library first</div>
      </PanelSectionRow>
    </PanelSection>);
  }
  else {
    get_managed_game_install_path(app.appid).then(saved_path => {
      if (saved_path) {
        get_active_profile(app.appid).then(active_profile => {
          if (active_profile)
            showProfileMenu(new AppInfo(app.appid, app.name, saved_path), active_profile);
          else
            showModdingMenu(new AppInfo(app.appid, app.name, saved_path));
        })
      }
      else {
        setModeckyMenu(<PanelSection>
          <PanelSectionRow>
            <div className={staticClasses.Text}>Would you like to start managing game "{app.name}" with appid {app.appid} for modding?</div>
          </PanelSectionRow>

          <PanelSectionRow>
            <ButtonItem onClick={() => manage_game(app.appid, app.name, app.install_folder).then(() => showModdingMenu(app))} layout="below">
              Mod this game
            </ButtonItem>
          </PanelSectionRow>
        </PanelSection>);
      }
    });
  }
}


// DECKY STUFF

function Content() {
  const [modecky, setModecky] = useState<JSX.Element | null>(null);
  setModeckyMenu = setModecky;
  getModeckyMenu = () => { return modecky; };

  useEffect(() => {
    if (modecky == null) {
      findCurrentAppInfo().then(app => {
        generateCurrentGameMenu(app);
      })
    }
  }, []);

  return (
    modecky ?? <div>Loading...</div>
  );
};

export default definePlugin(() => {
  console.log("MoDecky initializing...")
  SteamClient.InstallFolder.RefreshFolders();

  return {
    // The name shown in various decky menus
    name: "MoDecky",
    // The element displayed at the top of your plugin's menu
    titleView: <div className={staticClasses.Title}>MoDecky</div>,
    // The content of your plugin's menu
    content: <Content />,
    // The icon displayed in the plugin list
    icon: <img src={Logo} style={{height: "32px", objectFit: "contain"}}/>,
    // The function triggered when your plugin unloads
    onDismount() {
      console.log("Unloading MoDecky...")
    },
  };
});
