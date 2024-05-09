import { existsSync, writeFileSync, readFileSync } from "fs";

export class UserConfig {
  constructor(userConfigPath) {
    this.userConfigPath = userConfigPath;
    if (existsSync(userConfigPath)) {
      try {
        this.list = new Map(JSON.parse(readFileSync(userConfigPath, "utf-8")));
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
