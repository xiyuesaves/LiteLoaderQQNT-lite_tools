import { isqwq, isll } from "@/renderer/utils/loaderInspector";

function join(...parts: string[]) {
  const normalizedParts = parts.filter((p) => typeof p === "string" && p !== "").map((p) => p.replace(/\\/g, "/"));

  if (normalizedParts.length === 0) return ".";

  const joinedPath = normalizedParts.join("/");
  const segments = joinedPath.split("/");

  const stack = [];
  const isAbsolute = joinedPath.startsWith("/") || /^[a-zA-Z]:\//.test(joinedPath);

  for (const segment of segments) {
    if (segment === "..") {
      if (stack.length > 0 && stack[stack.length - 1] !== "..") {
        stack.pop();
      } else if (!isAbsolute) {
        stack.push("..");
      }
    } else if (segment !== "." && segment !== "") {
      stack.push(segment);
    }
  }

  let result = stack.join("/");

  // 处理前缀：如果是绝对路径，补回开头的 /
  if (isAbsolute && !result.startsWith("/")) {
    if (!/^[a-zA-Z]:/.test(result)) {
      result = "/" + result;
    }
  }

  return result || (isAbsolute ? "/" : ".");
}

function resolvePath(filePath: string) {
  if (isll) {
    return `local:///${filePath}`;
  } else if (isqwq) {
    return qwqnt.framework.protocol.pathToStorageUrl(filePath);
  }
  return filePath;
}

function basename(input: string, suffix: string = "") {
  if (typeof input !== "string") {
    throw new TypeError("path must be a string");
  }

  if (typeof suffix !== "string") {
    throw new TypeError("suffix must be a string");
  }

  // 忽略末尾连续的 / 和 \
  let end = input.length;
  // 字符比对性能远高于正则 test
  while (end > 0 && (input[end - 1] === "/" || input[end - 1] === "\\")) {
    end--;
  }

  if (end === 0) return "";

  const slashIndex = input.lastIndexOf("/", end - 1);
  const backslashIndex = input.lastIndexOf("\\", end - 1);
  const start = Math.max(slashIndex, backslashIndex) + 1;

  let name = input.slice(start, end);

  if (suffix && name.endsWith(suffix)) {
    name = name.slice(0, -suffix.length);
  }

  return name;
}

export { join, resolvePath, basename };
