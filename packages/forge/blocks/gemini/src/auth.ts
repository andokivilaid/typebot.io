import { createAuth, option } from "@typebot.io/forge";

export const auth = createAuth({
  type: "encryptedCredentials",
  name: "Google account",
  schema: option.object({
    apiKey: option.string.meta({
      layout: {
        label: "API key",
        isRequired: true,
        inputType: "password",
        helperText:
          "You can generate an API key [here](https://aistudio.google.com/apikey).",
        withVariableButton: false,
        isDebounceDisabled: true,
      },
    }),
  }),
});
