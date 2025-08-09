import {
  ButtonItem,
  PanelSection,
  PanelSectionRow,
  staticClasses
} from "@decky/ui";
import {
  callable,
  definePlugin,
} from "@decky/api"
import {
  Router
}
from "decky-frontend-lib";
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

const is_game_managed = callable<[game_name: string], number>("is_game_managed");
const manage_game = callable<[game_name: string, game_path: string], void>("manage_game");
const unmanage_game = callable<[game_name: string], void>("unmanage_game");


// UTILITY FUNCTIONS

var setModeckyMenu: React.Dispatch<React.SetStateAction<JSX.Element | null>>;

async function findCurrentAppInfo(): Promise<AppInfo | null> {
  const doc = Router.WindowStore?.GamepadUIMainWindowInstance?.BrowserWindow.document;

  const in_game_menu = await new Promise<boolean>((resolve) => {
    var found_play_button = false;
    doc?.querySelectorAll("div[role = \"button\"]").forEach(el => {
      if (el.textContent.includes("Play"))
        found_play_button = true;
    })
    resolve(found_play_button);
  })

  if (!in_game_menu)
    return null;

  const html = doc?.documentElement.innerHTML;

  const folders = await SteamClient.InstallFolder.GetInstallFolders();
  for (const folder of folders)
    for (const app of folder.vecApps)
      if (html?.includes(app.nAppID.toString()))
        return new AppInfo(app.nAppID, app.strAppName, folder.strFolderPath.concat("/steamapps/common/" + app.strAppName));
  
  const appname_found = await new Promise<string | null>((resolve) => {
    resolve(doc?.querySelector("text")?.textContent ?? null);
  })

  if (appname_found)
    return new AppInfo(-2, appname_found, "NONE");

  return null;
}

function enableModding(app: AppInfo) {
  const game_name = (app.appid == -2) ? app.name : app.appid.toString();

  setModeckyMenu(<PanelSection>
    <PanelSectionRow>
      <div className={staticClasses.Text}>Now modding {app.appid}</div>
    </PanelSectionRow>

    <PanelSectionRow>
      <ButtonItem onClick={() => {unmanage_game(game_name); setModeckyMenu(null); generateCurrentGameMenu(app);}} layout="below">
        Stop managing game
      </ButtonItem>
    </PanelSectionRow>

    <PanelSectionRow>
      <div className={staticClasses.Text}>
        Warning: This will delete all modding data for the chosen game
      </div>
    </PanelSectionRow>
  </PanelSection>)

  manage_game(game_name, app.install_folder);
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
    is_game_managed((app.appid == -2) ? app.name : app.appid.toString()).then(game_exists => {
      if (!game_exists) {
        setModeckyMenu(<PanelSection>
          <PanelSectionRow>
            <div className={staticClasses.Text}>Would you like to start managing game "{app.name}" for modding?</div>
          </PanelSectionRow>

          <PanelSectionRow>
            <ButtonItem onClick={() => enableModding(app)} layout="below">
              Mod this game
            </ButtonItem>
          </PanelSectionRow>
        </PanelSection>);
      }
      else {
        enableModding(app);
      }
    })
  }
}


// DECKY STUFF

function Content() {
  const [modecky, setModecky] = useState<JSX.Element | null>(null);
  setModeckyMenu = setModecky;

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (modecky == null)
        findCurrentAppInfo().then(app => generateCurrentGameMenu(app ?? null))
    }, 500);

    return () => clearTimeout(timeout);
  }, []);

  return (
    modecky ?? <div>Nothing here</div>
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
