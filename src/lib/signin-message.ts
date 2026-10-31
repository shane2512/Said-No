import { DAPP_NAME } from "./identity";

export const signInMessage = (address: string, expires: number) =>
  `${DAPP_NAME} sign-in\nAddress: ${address}\nExpires: ${expires}\nThis only unlocks your own memories. It does not move funds.`;
