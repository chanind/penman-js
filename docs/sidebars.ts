import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  // By default, Docusaurus generates a sidebar from the docs folder structure
  docSidebar: [
    'intro',
    'quick-start',
    {
      type: 'html',
      value: 'API Reference',
      className: 'sidebar-section-label',
    },
    'api.penman',
    'api.codec',
    'api.constant',
    'api.exceptions',
    'api.graph',
    'api.layout',
    'api.model',
    'api.surface',
    'api.transform',
    'api.tree',
  ],

  // But you can create a sidebar manually
  /*
  tutorialSidebar: [
    'intro',
    'hello',
    {
      type: 'category',
      label: 'Tutorial',
      items: ['tutorial-basics/create-a-document'],
    },
  ],
   */
};

export default sidebars;
