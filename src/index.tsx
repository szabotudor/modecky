import {
  PanelSection,
  PanelSectionRow,
  staticClasses
} from "@decky/ui";
import {
  definePlugin,
  // routerHook
} from "@decky/api"
import Logo from "../assets/xelu/Steam Deck/SteamDeck_Power.png";
import { GameAction } from "@decky/ui/dist/globals/steam-client/App";
import { useEffect, useState } from "react";

function Content() {
  return (
    <PanelSection>
      <PanelSectionRow>
        <div className={staticClasses.Title}>Hello World</div>
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
