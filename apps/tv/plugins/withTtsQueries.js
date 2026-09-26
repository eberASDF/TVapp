const { withAndroidManifest } = require("expo/config-plugins");
module.exports = (config) =>
  withAndroidManifest(config, (result) => {
    const manifest = result.modResults.manifest;
    manifest.queries = manifest.queries || [{}];
    const queries = manifest.queries[0] || (manifest.queries[0] = {});
    queries.intent = queries.intent || [];
    if (
      !queries.intent.some((intent) =>
        intent.action?.some(
          (action) =>
            action.$?.["android:name"] === "android.intent.action.TTS_SERVICE",
        ),
      )
    ) {
      queries.intent.push({
        action: [
          { $: { "android:name": "android.intent.action.TTS_SERVICE" } },
        ],
      });
    }
    return result;
  });
