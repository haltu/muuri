import { version } from '../../package.json';

export default {
  lang: 'en-US',
  title: 'Muuri',
  description: 'Build all kinds of layouts',

  head: [['link', { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }]],

  lastUpdated: true,

  // Experimental Feature - it is giving 404 when reloading the page in the docs
  // cleanUrls: 'without-subfolders',

  themeConfig: {
    logo: '/logo.svg',

    nav: nav(),

    sidebar: {
      '/guide/': sidebarGuide(),
    },

    editLink: {
      pattern: 'https://github.com/haltu/muuri/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/haltu/muuri' }],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2017-present Niklas Rämö',
    },

    algolia: {
      appId: 'xxxxx',
      apiKey: 'xxxxx',
      indexName: 'muuri',
    },

    // carbonAds: {
    //   code: "xxxxx",
    //   placement: "xxxxx",
    // },
  },
};

function nav() {
  return [
    { text: 'Docs', link: '/guide/what-is-muuri', activeMatch: '/guide/' },
    {
      text: 'Examples',
      link: '/guide/examples',
      activeMatch: '/guide/examples',
    },
    {
      text: version,
      items: [
        {
          text: 'Changelog',
          link: 'https://github.com/haltu/muuri/releases',
        },
        {
          text: 'Contributing',
          link: 'https://github.com/haltu/muuri/blob/master/CONTRIBUTING.md',
        },
      ],
    },
  ];
}

function sidebarGuide() {
  return [
    {
      text: 'Introduction',
      collapsible: true,
      items: [
        { text: 'What is Muuri?', link: '/guide/what-is-muuri' },
        { text: 'Getting Started', link: '/guide/getting-started' },
        { text: 'Motivation', link: '/guide/motivation' },
        { text: 'Credits', link: '/guide/credits' },
      ],
    },
    {
      text: 'API',
      collapsible: true,
      items: [
        { text: 'Grid Constructor', link: '/guide/grid-constructor' },
        { text: 'Grid Options', link: '/guide/grid-options' },
        { text: 'Grid Methods', link: '/guide/grid-methods' },
        { text: 'Grid Events', link: '/guide/grid-events' },
        { text: 'Item Methods', link: '/guide/item-methods' },
      ],
    },
    {
      text: 'Examples',
      collapsible: true,
      items: [{ text: 'Demos', link: '/guide/examples' }],
    },
  ];
}
