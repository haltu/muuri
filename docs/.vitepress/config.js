import { version } from '../../package.json';

export default {
  title: 'Muuri Docs',
  description: 'Documentation for Muuri JavaScript library.',

  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: '/muuri-icon.svg' }]],

  lastUpdated: true,

  // Experimental Feature - it is giving 404 when reloading the page in the docs
  // cleanUrls: 'without-subfolders',

  themeConfig: {
    logo: '/muuri-icon.svg',

    nav: nav(),

    sidebar: {
      '/': sidebarGuide(),
    },

    editLink: {
      pattern: 'https://github.com/haltu/muuri/edit/master/docs/:path',
      text: 'Edit this page on GitHub',
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/haltu/muuri' }],

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
      collapsible: false,
      items: [
        { text: 'Introduction', link: '/' },
        { text: 'Getting Started', link: '/getting-started' },
        { text: 'Examples', link: '/examples' },
      ],
    },
    {
      text: 'API',
      collapsible: false,
      items: [
        { text: 'Grid Constructor', link: '/grid-constructor' },
        { text: 'Grid Options', link: '/grid-options' },
        { text: 'Grid Methods', link: '/grid-methods' },
        { text: 'Grid Events', link: '/grid-events' },
        { text: 'Item Methods', link: '/item-methods' },
      ],
    },
  ];
}
