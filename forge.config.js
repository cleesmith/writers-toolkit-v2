const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    asar: true,
    name: 'WritersToolkit',
    executableName: 'writers-toolkit',
    icon: './resources/icon',
    osxSign: false, // Explicitly disable signing
    osxNotarize: false, // Explicitly disable notarization
    // Include all src directories as extra resources
    extraResources: [
      './src/cache',
      './src/claude-api',
      './src/tools',
      './src/utils'
    ]
  },
  asarUnpack: [
    'src/**'
  ],
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        // Windows specific settings
        setupIcon: './resources/icon.ico',
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-dmg',
      icon: './resources/WritersToolkit.icns',
    },
    // Comment out these Linux makers since you're focusing on Mac/Windows
    // {
    //   name: '@electron-forge/maker-deb',
    //   config: {},
    // },
    // {
    //   name: '@electron-forge/maker-rpm',
    //   config: {},
    // },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  // Add this if you want to publish to GitHub
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'cleesmith',
          name: 'writers-toolkit-v2'
        },
        prerelease: false
      }
    }
  ]
};