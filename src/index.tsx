import {
  ButtonItem,
  MenuSeparator,
  PanelSection,
  PanelSectionRow,
  staticClasses
} from "@decky/ui";
import {
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


// UTILITY FUNCTIONS

var setModeckyMenu: React.Dispatch<React.SetStateAction<JSX.Element | null>>;

async function findCurrentAppInfo(): Promise<AppInfo | null> {
  const doc = Router.WindowStore?.GamepadUIMainWindowInstance?.BrowserWindow.document;
  const html = doc?.documentElement.innerHTML;

  const folders = await SteamClient.InstallFolder.GetInstallFolders();
  for (const folder of folders)
    for (const app of folder.vecApps)
      if (html?.includes(app.nAppID.toString()))
        return new AppInfo(app.nAppID, app.strAppName, folder.strFolderPath.concat("/stamapps/common/" + app.strAppName));
  
  const appname_found = await new Promise<string | null>((resolve) => {
    doc?.querySelectorAll("div[role = \"button\"]").forEach(el => {
      if (el.textContent.includes("Play"))
        resolve(doc.querySelector("text")?.textContent ?? "No App Found");
    })
  })

  if (appname_found)
    return new AppInfo(-2, appname_found, "Could not infer path");

  return null;
}

function enableModding(appid: number | string) {}


// MENUS

function generateCurrentGameMenu() {
  findCurrentAppInfo().then(app => {
    if (!app || !app.appid) {
      setModeckyMenu(<PanelSection>
        <PanelSectionRow>
          <div className={staticClasses.Text}>Select a game in your library first</div>
        </PanelSectionRow>  
      </PanelSection>);
    }
    else {
      setModeckyMenu(<PanelSection>
        <PanelSectionRow>
          <div className={staticClasses.Text}>Modding game "{app.name}"</div>
        </PanelSectionRow>

        <PanelSectionRow>
          <ButtonItem onClick={() => enableModding(app.appid)} layout="below">
            Mod this game
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>);
    }
  });
}


// DECKY STUFF

function Content() {
  const [modecky, setModecky] = useState<JSX.Element | null>(null);
  setModeckyMenu = setModecky;

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!modecky)
        generateCurrentGameMenu();
    }, 200);

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
