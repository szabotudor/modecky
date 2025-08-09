import {
  ButtonItem,
  PanelSection,
  PanelSectionRow,
  staticClasses
} from "@decky/ui";
import {
  callable,
  definePlugin
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

const is_game_managed = callable<[appid: number], boolean>("is_game_managed");
const manage_game = callable<[appid: number, game_name: string, game_path: string], void>("manage_game");
const unmanage_game = callable<[appid: number], void>("unmanage_game");
const find_non_steam_game_name = callable<[appid: number], string>("find_non_steam_game_name");


// UTILITY FUNCTIONS

var setModeckyMenu: React.Dispatch<React.SetStateAction<JSX.Element | null>>;

async function findCurrentAppInfo(): Promise<AppInfo | null> {
  const url = Object.values(window).find(v => v.navigator)?.location.toString();
  const match = url?.match(/\/library\/app\/(\d+)/);
  const appid = match ? parseInt(match[1]) : null;

  if (!appid)
    return null;
  
  var [name, appfolder] = await new Promise<[string, string] | [null]>(async resolve => {
    SteamClient.InstallFolder.GetInstallFolders().then(folders => folders.forEach(folder => folder.vecApps.forEach(app => {
      if (app.nAppID == appid)
        resolve([app.strAppName, folder.strFolderPath.concat("/steamapps/common/" + app.strAppName)]);
    })));
    resolve([null]);
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

function enableModding(app: AppInfo) {
  setModeckyMenu(<PanelSection>
    <PanelSectionRow>
      <div className={staticClasses.Text}>Now modding "{app.name}" with appid {app.appid}<br/></div>
    </PanelSectionRow>

    <PanelSectionRow>
      <ButtonItem onClick={() => {unmanage_game(app.appid); setModeckyMenu(null); generateCurrentGameMenu(app);}} layout="below">
        Stop managing game
      </ButtonItem>
    </PanelSectionRow>

    <PanelSectionRow>
      <div className={staticClasses.Text}>
        Warning: This will delete all modding data for the chosen game
      </div>
    </PanelSectionRow>
  </PanelSection>)

  manage_game(app.appid, app.name, app.install_folder);
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
    is_game_managed(app.appid).then(game_exists => {
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
      if (modecky == null) {
        findCurrentAppInfo().then(app => {
          generateCurrentGameMenu(app ?? null);
        })
      }
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
