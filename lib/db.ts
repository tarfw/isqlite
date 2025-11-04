import { init } from "@instantdb/react-native";
import schema from "../instant.schema";

const FALLBACK_APP_ID = "1be71d54-11aa-4705-a2b1-e96753009db4";

export const db = init({
  appId: process.env.EXPO_PUBLIC_INSTANT_APP_ID || FALLBACK_APP_ID,
  schema,
});
