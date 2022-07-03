import React, { useContext, useLayoutEffect } from "react";
import genesisBlock from "assets/land/levels/1.png";
import { GRID_WIDTH_PX } from "../lib/constants";
import { Section, useScrollIntoView } from "lib/utils/hooks/useScrollIntoView";
import pebble from "assets/resources/small_stone.png";
import shrub from "assets/resources/green_bush.png";
import plantableSoil from "assets/land/soil2.png";
import { MapPlacement } from "./components/MapPlacement";
import { useActor } from "@xstate/react";
import { Context } from "../GameProvider";
import { getTerrainImageByKey } from "../lib/getTerrainImageByKey";
import { WaterDecoration } from "./components/water/WaterDecoration";

export const Land: React.FC = () => {
  const { gameService } = useContext(Context);
  const [
    {
      context: { state },
    },
  ] = useActor(gameService);

  const { pebbles, shrubs, terrains, plots } = state;

  const [scrollIntoView] = useScrollIntoView();

  useLayoutEffect(() => {
    scrollIntoView(Section.GenesisBlock, "auto");
  }, []);

  return (
    <div
      style={{ width: `${GRID_WIDTH_PX * 8}px` }}
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
    >
      <div
        className="relative w-full h-full"
        style={{
          height: "370px",
        }}
      >
        <img
          id="genesisBlock"
          src={genesisBlock}
          alt="land"
          className="w-full"
        />
        {/*
        The show prop receives an array of positions to show,
        Example: there are blocks of terrain on top and bottom hence those positions should be hidden
        just pass ["left", "right"] to show only sides.
        */}
        <WaterDecoration show={["all"]} />
        {/* Example placement of shrub */}
        {Object.values(shrubs).map(({ x, y, width, height }, index) => (
          <MapPlacement key={index} x={x} y={y} height={height} width={width}>
            <img src={shrub} className="h-full w-full" />
          </MapPlacement>
        ))}
        {/* Example placement of pebbles */}
        {Object.values(pebbles).map(({ x, y, width, height }, index) => (
          <MapPlacement key={index} x={x} y={y} height={height} width={width}>
            <img src={pebble} className="h-full w-full" />
          </MapPlacement>
        ))}
        {/* Example placement of terrains */}
        {Object.values(terrains).map(({ name, x, y, width, height }, index) => (
          <MapPlacement key={index} x={x} y={y} height={height} width={width}>
            <img src={getTerrainImageByKey(name)} className="h-full w-full" />
          </MapPlacement>
        ))}
        {/* Example placement of fields */}
        {Object.values(plots).map(({ x, y, width, height }, index) => (
          <MapPlacement key={index} x={x} y={y} height={height} width={width}>
            <img src={plantableSoil} className="h-full w-full" />
          </MapPlacement>
        ))}
      </div>
    </div>
  );
};
