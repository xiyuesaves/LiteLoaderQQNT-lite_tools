export function checkChatType(peer) {
  return [1, 2, 100].includes(peer?.chatType);
}
