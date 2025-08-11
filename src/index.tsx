import {
  ButtonItem,
  PanelSection,
  PanelSectionRow,
  staticClasses
} from "@decky/ui";
import {
  callable,
  definePlugin,
  FileSelectionType,
  openFilePicker
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

// 0 - disabled
// 1 - partial instalation (maybe failed, cannot use uninstall.json to uninstall mod, will delete mod files directly when disabling the mod)
// Might attempt to revert replaced game files, but no guarantee is made for the success of this operation
// 2 - successful installation (will use uninstall.json to uninstall mod properly, and revert any replaced game files)
const scan_mods = callable<[appid: number], string[]>("scan_mods");


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


function browse_for_game(app: AppInfo) {
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

function showModdingMenu(app: AppInfo) {
  scan_mods(app.appid).then(mods => {
    var mods_section: Array<JSX.Element> = new Array<JSX.Element>;
    
    mods.forEach(mod => {
      mods_section.push(<div className={staticClasses.Text}>{mod}</div>)
    });

    setModeckyMenu(<PanelSection>
    <PanelSectionRow>
      <div className={staticClasses.Text}>Now modding "{app.name}" with appid {app.appid}</div>
    </PanelSectionRow>

    <PanelSectionRow>
      <div className={staticClasses.Text}><br/>Installation path: {app.install_folder}</div>
    </PanelSectionRow>

    <PanelSectionRow>
      <ButtonItem onClick={() => {browse_for_game(app)}} layout="below">
        Browse
      </ButtonItem>
    </PanelSectionRow>

    <PanelSectionRow>
      <div className={staticClasses.Text}><br/>Available mods:</div>
      {mods_section}
      <div className={staticClasses.Text}><br/></div>
    </PanelSectionRow>

    <PanelSectionRow>
      <ButtonItem onClick={() => confirmationMenu(
        <div>Are you sure?<br/>WARNING: This will delete all modding data and mods for this game</div>, "Yes I'm Sure", "Nevermind",
        () => {unmanage_game(app.appid).then(() => generateCurrentGameMenu(app));}
      )} layout="below">
        Stop managing game
      </ButtonItem>
    </PanelSectionRow>
  </PanelSection>)
  })
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
        showModdingMenu(new AppInfo(app.appid, app.name, saved_path));
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
