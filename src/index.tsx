import {
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
import { ReactNode, useEffect, useState } from "react";

class Provider<T> {
  element: JSX.Element = <div>Empty Provider</div>;
  setter: React.Dispatch<React.SetStateAction<T>> = (_v: React.SetStateAction<T>) => { throw "invalid setter inside provider"; };
};

function AppProvider<T extends ReactNode>(default_text: string) {
  const provider: Provider<T | null> = new Provider<T | null>();

  const component: React.FC = () => {
    const [app, setApp] = useState<T | null>(null);
    provider.setter = setApp;
    provider.element = <div>{app ?? default_text}</div>
    return provider.element;
  };

  return {provider, component};
}

const appid = AppProvider<JSX.Element>("Select a game to continue.");

function Content() {
  useEffect(() => {
    const interval = setInterval(() => {
      SteamClient.InstallFolder.RefreshFolders();
      
      SteamClient.InstallFolder.GetInstallFolders().then(folders => {
        const collected: string[] = [];

        folders.forEach(folder => { folder.vecApps.forEach(app => {
          collected.push(app.nAppID.toString());
        })})

        collected.forEach(app => {
          if (Router.WindowStore?.GamepadUIMainWindowInstance?.BrowserWindow.document.documentElement.innerHTML.includes(app)) {
            appid.provider.setter(<div className={staticClasses.Title}>{app}</div>);
          }
        })
      })
    }, 1000);

    return () => clearInterval(interval);
  }, []);
  
  return (
    <PanelSection>
      <PanelSectionRow>
        <appid.component />
      </PanelSectionRow>
    </PanelSection>
  );
};

export default definePlugin(() => {
  console.log("MoDecky initializing...")

  return {
    // The name shown in various decky menus
    name: "MoDecky",
    // The element displayed at the top of your plugin's menu
    titleView: <div className={staticClasses.Title}>Decky Example Plugin</div>,
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
