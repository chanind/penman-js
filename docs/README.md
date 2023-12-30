# Penman-JS docs

The docs for Penman-js are built using [Docusaurus](https://docusaurus.io/).

### Installation

```
$ yarn
```

### Local Development

First, generate API docs from typedoc using:

```
$ yarn generate-api
```

Next, start the local dev server with:

```
$ yarn start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

### Build

```
$ yarn build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

### Customizing API docs

The API documentation is generated using a modified typedoc theme, in the `typedoc-simple-mdx-theme` folder.
This folder contains template files which can be use to control how the API docs render.
