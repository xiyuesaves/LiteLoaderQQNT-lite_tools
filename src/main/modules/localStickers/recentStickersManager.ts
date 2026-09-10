import fs from "node:fs";
import path from "node:path";
import { configManager } from "@/main/modules/configManager";

import type { Path, Sticker, Stickers, StickerPack } from "@/common/types/localStickers";

class RecentStickersManager {
  private recentStickers: StickerPack = { label: "常用贴纸", icon: "", index: -1, dirPath: "", stickers: [] };
  private recentStickersPath: string = "";

  private ensureConfigExists(): void {
    try {
      // 先查找目录下是否有sticker.json配置文件
      if (fs.existsSync(this.recentStickersPath)) {
        const stickers = JSON.parse(fs.readFileSync(this.recentStickersPath, "utf-8")) as Stickers;
        this.recentStickers.stickers = stickers;
        if (stickers.length > 0) {
          this.recentStickers.icon = stickers[0].path;
        }
      } else {
        this.recentStickers.stickers = [];
        this.writeConfig(this.recentStickersPath, []);
      }
    } catch (err) {
      this.recentStickers.stickers = [];
      this.writeConfig(this.recentStickersPath, []);
    }
  }

  private writeConfig(path: string, stickers: Stickers) {
    fs.writeFileSync(path, JSON.stringify(stickers, null, 2), "utf-8");
  }

  public setRootPath(rootPath: string) {
    this.recentStickersPath = path.join(rootPath, "recentStickers.json");
    this.ensureConfigExists();
  }

  public updateRecentStickers(sticker: Sticker) {
    const index = this.recentStickers.stickers.findIndex((item) => item.path === sticker.path);
    if (index > -1) {
      this.recentStickers.stickers.splice(index, 1);
    }
    this.recentStickers.icon = sticker.path;
    this.recentStickers.stickers.unshift(sticker);
    const maxStickers =
      configManager.value.localStickers.stickersPerRow * configManager.value.localStickers.recentStickers.limit;
    this.recentStickers.stickers = this.recentStickers.stickers.slice(0, maxStickers);
    this.writeConfig(this.recentStickersPath, this.recentStickers.stickers);
  }

  public deleteSticker(inputPath: Path) {
    const stickerPath = inputPath.replace(/\\/g, "/");
    const index = this.recentStickers.stickers.findIndex((item) => item.path === stickerPath);
    if (index > -1) {
      this.recentStickers.stickers.splice(index, 1);
      this.writeConfig(this.recentStickersPath, this.recentStickers.stickers);
    }
    if (this.recentStickers.icon === stickerPath && this.recentStickers.stickers.length) {
      this.recentStickers.icon = this.recentStickers.stickers[0].path;
    }
  }

  public getRecentStickers() {
    const maxStickers =
      configManager.value.localStickers.stickersPerRow * configManager.value.localStickers.recentStickers.limit;
    this.recentStickers.stickers = this.recentStickers.stickers.slice(0, maxStickers);
    return this.recentStickers;
  }
}

const recentStickersManager = new RecentStickersManager();
export { recentStickersManager };
