import { existsSync, writeFileSync } from "fs";

export class UserConfig {
  constructor(userConfigPath) {
    this.userConfigPath = userConfigPath;
    if (existsSync(userConfigPath)) {
      try {
        this.list = new Map(require(userConfigPath));
      } catch (err) {
        this.list = new Map();
        writeFileSync(userConfigPath, "[]");
      }
    } else {
      writeFileSync(userConfigPath, "[]");
    }
  }
  get(id) {
    return this.list.get(id);
  }
  set(id, value) {
    this.list.set(id, value);
    this.save();
  }
  delete(id) {
    this.list.delete(id);
    this.save();
  }
  save() {
    writeFileSync(this.userConfigPath, JSON.stringify([...this.list]));
  }
}
