// src/types/config.d.ts
import configJson from "@/config/main.template.json";

type _BaseConfig = typeof configJson;

type FuncBar = {
  name: string;
  id: string;
  enabled?: boolean;
};

type ObjectFit = "cover" | "contain" | "fill";
type CoverArea = "chat" | "full";
type SortType = "default" | "fileName" | "fileName-desc" | "createDate" | "createDate-desc";

type Wallpaper = {
  enabled: boolean;
  imagePath: string;
  objectFit: ObjectFit;
  coverArea: CoverArea;
  opacity: number;
};

type ExtendedConfig = Omit<BaseConfig, "chatFuncBar" | "topFuncBar" | "localStickers"> & {
  topFuncBar: FuncBar[];
  chatFuncBar: FuncBar[];
  localStickers: Omit<BaseConfig["localStickers"], "sort"> & {
    sort: SortType;
  };
  interface: Omit<BaseConfig["interface"], "wallpaper"> & {
    wallpaper: Wallpaper;
  };
};

type ObjectPaths<T> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends any[]
        ? K
        : T[K] extends Record<string, any>
          ? K | `${K}.${ObjectPaths<T[K]>}`
          : K;
    }[keyof T & string]
  : never;

type _ConfigPath = ObjectPaths<ExtendedConfig>;

declare global {
  type Config = ExtendedConfig;
  type FuncBar = FuncBar;
  type BaseConfig = _BaseConfig;
  type ConfigPath = _ConfigPath;
}

export {};
