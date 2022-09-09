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
      '/': sidebarGuide(),
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
    { text: 'Docs', link: '/what-is-muuri', activeMatch: '/' },
    {
      text: 'Examples',
      link: '/examples',
      activeMatch: '/examples',
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
        { text: 'What is Muuri?', link: '/' },
        { text: 'Getting Started', link: '/getting-started' },
        { text: 'Motivation', link: '/motivation' },
        { text: 'Credits', link: '/credits' },
      ],
    },
    {
      text: 'API',
      collapsible: true,
      items: [
        { text: 'Grid Constructor', link: '/grid-constructor' },
        { text: 'Grid Options', link: '/grid-options' },
        { text: 'Grid Methods', link: '/grid-methods' },
        { text: 'Grid Events', link: '/grid-events' },
        { text: 'Item Methods', link: '/item-methods' },
      ],
    },
    {
      text: 'Examples',
      collapsible: true,
      items: [{ text: 'Demos', link: '/examples' }],
    },
  ];
}
