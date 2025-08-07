import {
  PanelSection,
  PanelSectionRow,
  staticClasses
} from "@decky/ui";
import {
  definePlugin,
} from "@decky/api"
import {
  Router,
  sleep
}
from "decky-frontend-lib";
import Logo from "../assets/xelu/Steam Deck/SteamDeck_Power.png";
import { useEffect, useState } from "react";
import { AppInfo, SteamInstallFolder } from "@decky/ui/dist/globals/steam-client/InstallFolder";

function Content() {
  const [appid, setAppid] = useState<string | null>("noapps");
  
  useEffect(() => {
    const interval = setInterval(() => {
      SteamClient.InstallFolder.RefreshFolders();
      
      SteamClient.InstallFolder.GetInstallFolders().then(folders => {
        const collected: string[] = [];

        folders.forEach(folder => { folder.vecApps.forEach(app => {
          collected.push(app.nAppID.toString());
        })})

        var allapps = "";

        collected.forEach(app => {
          // if (Router.WindowStore?.GamepadUIMainWindowInstance?.BrowserWindow.document.documentElement.innerHTML.includes(app)) {
          //   if (appid == null)
          //     setAppid(app);
          //   else
          //     setAppid("noapp");
          // }
          allapps += app + '\n';
        })

        setAppid(allapps);
      })
    }, 1000);

    return () => clearInterval(interval);
  }, []);
  
  return (
    <PanelSection>
      <PanelSectionRow>
        <div className={staticClasses.Title}>{appid ?? "??"}</div>
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
